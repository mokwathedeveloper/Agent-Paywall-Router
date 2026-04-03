import { x402HTTPResourceServer, x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { DEFAULT_FACILITATOR_URL, STELLAR_NETWORK, TOOL_PRICES_TOKEN_UNITS, USDC_TESTNET_ADDRESS } from "@/lib/constants";

// Local adapter type to avoid importing internal/hushed module paths from @x402/core dist.
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

type X402Route = "GET /api/tools/search" | "POST /api/tools/summarize" | "POST /api/tools/analyze";

const RECEIVER_ADDRESS = process.env.STELLAR_RECEIVER_ADDRESS ?? "";
const FACILITATOR_URL = process.env.FACILITATOR_URL ?? DEFAULT_FACILITATOR_URL;

const ROUTES: Record<X402Route, any> = {
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
  const r = req as any;
  const url = typeof r.url === "string" ? r.url : "";

  return {
    getHeader: (name: string) => {
      const direct = req.headers.get(name);
      if (direct) return direct;

      // Compatibility: some clients forward `x402-receipt` instead of `PAYMENT-SIGNATURE`.
      if (name.toLowerCase() === "payment-signature") {
        return req.headers.get("x402-receipt") ?? undefined;
      }

      return undefined;
    },
    getMethod: () => req.method,
    getPath: () => r?.nextUrl?.pathname ?? new URL(url).pathname,
    getUrl: () => url || req.url,
    getAcceptHeader: () => req.headers.get("accept") ?? "",
    getUserAgent: () => req.headers.get("user-agent") ?? "",
    getBody: undefined,
    getQueryParams: undefined,
    getQueryParam: undefined,
  } as HTTPAdapter;
}

async function getHttpServer() {
  assertX402Configured();
  if (httpServer) return httpServer;
  if (!initPromise) {
    initPromise = (async () => {
      const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
      const resourceServer = new x402ResourceServer(facilitatorClient).register("stellar:*", new ExactStellarScheme());
      const s = new x402HTTPResourceServer(resourceServer, ROUTES);
      await s.initialize();
      httpServer = s;
      return s;
    })();
  }
  return initPromise!;
}

export async function verifyPaidOrReturn402(req: Request): Promise<{
  result: any;
  paymentPayload?: any;
  paymentRequirements?: any;
}> {
  const server = await getHttpServer();
  const adapter = makeAdapter(req);
  const path = (req as any)?.nextUrl?.pathname ?? new URL(req.url).pathname;
  const method = req.method;

  const context = {
    adapter,
    path,
    method,
  };

  const res = await server.processHTTPRequest(context as any) as any;
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
  paymentPayload: any,
  paymentRequirements: any,
  transportContext?: any,
): Promise<{ headers: Record<string, string> }> {
  const server = await getHttpServer();
  const res = await server.processSettlement(paymentPayload, paymentRequirements, undefined, transportContext);
  if (!res.success) {
    const err = res.errorReason ? `${res.errorReason}: ${res.errorMessage ?? ""}` : "Payment settlement failed";
    throw new Error(err);
  }
  return { headers: res.headers };
}

