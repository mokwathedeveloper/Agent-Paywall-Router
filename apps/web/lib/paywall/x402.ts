import { x402HTTPResourceServer, x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { DEFAULT_FACILITATOR_URL, STELLAR_NETWORK, TOOL_PRICES_TOKEN_UNITS, USDC_TESTNET_ADDRESS } from "@/lib/constants";

// Local adapter type matching @x402/core internal HTTPAdapter interface
type HTTPAdapter = {
  getHeader(name: string): string | undefined;
  getMethod(): string;
  getPath(): string;
  getUrl(): string;
  getAcceptHeader(): string;
  getUserAgent(): string;
  getBody?: () => unknown;
  getQueryParams?: () => Record<string, string | string[]>;
  getQueryParam?: (name: string) => string | string[] | undefined;
};

// Opaque boundary types for @x402/core internals that don't export clean interfaces
type X402RouteConfig = {
  resource: string;
  description: string;
  mimeType: string;
  unpaidResponseBody: () => Promise<{ contentType: string; body: unknown }>;
  accepts: {
    scheme: string;
    network: string;
    asset: string;
    payTo: string;
    price: { asset: string; amount: string };
    extra: { areFeesSponsored: boolean };
    maxTimeoutSeconds: number;
  };
};

type X402Route = "GET /api/tools/search" | "POST /api/tools/summarize" | "POST /api/tools/analyze";

// x402 verified result shape returned by processHTTPRequest
type X402VerifiedResult = {
  type: "payment-verified" | "payment-error" | string;
  paymentPayload?: unknown;
  paymentRequirements?: unknown;
  response?: { body: BodyInit; status: number; headers: HeadersInit };
};

// x402 settlement result shape
type X402SettlementResult = {
  success: boolean;
  headers: Record<string, string>;
  errorReason?: string;
  errorMessage?: string;
};

const RECEIVER_ADDRESS = process.env.STELLAR_RECEIVER_ADDRESS ?? "";
const FACILITATOR_URL = process.env.FACILITATOR_URL ?? DEFAULT_FACILITATOR_URL;

const ROUTES: Record<X402Route, X402RouteConfig> = {
  "GET /api/tools/search": {
    resource: "/api/tools/search",
    description: "Paid tool: search",
    mimeType: "application/json",
    unpaidResponseBody: async () => ({
      contentType: "application/json",
      body: { error: "Payment Required" },
    }),
    accepts: {
      scheme: "exact",
      network: STELLAR_NETWORK,
      asset: USDC_TESTNET_ADDRESS,
      payTo: RECEIVER_ADDRESS,
      price: { asset: USDC_TESTNET_ADDRESS, amount: TOOL_PRICES_TOKEN_UNITS.search },
      extra: { areFeesSponsored: true },
      maxTimeoutSeconds: 60,
    },
  },
  "POST /api/tools/summarize": {
    resource: "/api/tools/summarize",
    description: "Paid tool: summarize",
    mimeType: "application/json",
    unpaidResponseBody: async () => ({
      contentType: "application/json",
      body: { error: "Payment Required" },
    }),
    accepts: {
      scheme: "exact",
      network: STELLAR_NETWORK,
      asset: USDC_TESTNET_ADDRESS,
      payTo: RECEIVER_ADDRESS,
      price: { asset: USDC_TESTNET_ADDRESS, amount: TOOL_PRICES_TOKEN_UNITS.summarize },
      extra: { areFeesSponsored: true },
      maxTimeoutSeconds: 60,
    },
  },
  "POST /api/tools/analyze": {
    resource: "/api/tools/analyze",
    description: "Paid tool: analyze",
    mimeType: "application/json",
    unpaidResponseBody: async () => ({
      contentType: "application/json",
      body: { error: "Payment Required" },
    }),
    accepts: {
      scheme: "exact",
      network: STELLAR_NETWORK,
      asset: USDC_TESTNET_ADDRESS,
      payTo: RECEIVER_ADDRESS,
      price: { asset: USDC_TESTNET_ADDRESS, amount: TOOL_PRICES_TOKEN_UNITS.analyze },
      extra: { areFeesSponsored: true },
      maxTimeoutSeconds: 60,
    },
  },
};

let initPromise: Promise<x402HTTPResourceServer> | null = null;
let httpServer: x402HTTPResourceServer | null = null;

function assertX402Configured() {
  if (!process.env.STELLAR_RECEIVER_ADDRESS) {
    throw new Error("Missing STELLAR_RECEIVER_ADDRESS; cannot verify paid tools.");
  }
}

function makeAdapter(req: Request): HTTPAdapter {
  // NextRequest extends Request and adds nextUrl — access safely via type narrowing
  const nextUrl = (req as Request & { nextUrl?: { pathname: string } }).nextUrl;
  const url = req.url ?? "";

  return {
    getHeader: (name: string) => {
      const direct = req.headers.get(name);
      if (direct) return direct;
      // Compatibility: some clients forward x402-receipt instead of PAYMENT-SIGNATURE
      if (name.toLowerCase() === "payment-signature") {
        return req.headers.get("x402-receipt") ?? undefined;
      }
      return undefined;
    },
    getMethod: () => req.method,
    getPath: () => nextUrl?.pathname ?? new URL(url).pathname,
    getUrl: () => url,
    getAcceptHeader: () => req.headers.get("accept") ?? "",
    getUserAgent: () => req.headers.get("user-agent") ?? "",
    getBody: undefined,
    getQueryParams: undefined,
    getQueryParam: undefined,
  };
}

async function getHttpServer() {
  assertX402Configured();
  if (httpServer) return httpServer;
  if (!initPromise) {
    initPromise = (async () => {
      const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
      const resourceServer = new x402ResourceServer(facilitatorClient).register(
        "stellar:*",
        new ExactStellarScheme()
      );
      // @x402/core does not export RoutesConfig publicly — cast at the library boundary
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = new x402HTTPResourceServer(resourceServer, ROUTES as unknown as any);
      await s.initialize();
      httpServer = s;
      return s;
    })();
  }
  return initPromise!;
}

export async function verifyPaidOrReturn402(req: Request): Promise<{
  result: X402VerifiedResult;
  paymentPayload?: unknown;
  paymentRequirements?: unknown;
}> {
  const server = await getHttpServer();
  const adapter = makeAdapter(req);
  const nextUrl = (req as Request & { nextUrl?: { pathname: string } }).nextUrl;
  const path = nextUrl?.pathname ?? new URL(req.url).pathname;

  const context = { adapter, path, method: req.method };
  const res = await server.processHTTPRequest(context as Parameters<typeof server.processHTTPRequest>[0]) as X402VerifiedResult;

  if (res?.type === "payment-verified") {
    return {
      result: res,
      paymentPayload: res.paymentPayload,
      paymentRequirements: res.paymentRequirements,
    };
  }
  return { result: res };
}

export async function settlePaymentForTool(
  paymentPayload: unknown,
  paymentRequirements: unknown,
  transportContext?: unknown,
): Promise<{ headers: Record<string, string> }> {
  const server = await getHttpServer();
  const res = await server.processSettlement(
    paymentPayload as Parameters<typeof server.processSettlement>[0],
    paymentRequirements as Parameters<typeof server.processSettlement>[1],
    undefined,
    transportContext as Parameters<typeof server.processSettlement>[3]
  ) as X402SettlementResult;

  if (!res.success) {
    const err = res.errorReason
      ? `${res.errorReason}: ${res.errorMessage ?? ""}`
      : "Payment settlement failed";
    throw new Error(err);
  }
  return { headers: res.headers };
}
