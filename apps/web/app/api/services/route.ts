/**
 * GET /api/services
 * Agent-optimised service marketplace registry.
 * Returns available paid services sorted by price (cheapest first).
 *
 * POST /api/services
 * Allows external service providers to register with the system.
 */
import { NextResponse } from "next/server";
import { getAllServices, addService } from "@/lib/db";

export interface ServiceEntry {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  protocol: string;
  endpoint: string;
  method: string;
  inputParam: string;
  stellarNetwork: string;
  spendingPolicyContract: string;
}

export async function GET(_req: Request): Promise<NextResponse> {
  const dbServices = await getAllServices();
  
  const services: ServiceEntry[] = dbServices.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    priceUsd: s.price_usd,
    protocol: s.protocol,
    endpoint: s.endpoint,
    method: s.method,
    inputParam: s.input_param,
    stellarNetwork: s.stellar_network,
    spendingPolicyContract: s.spending_policy_contract,
  }));

  return NextResponse.json(
    {
      services: services,
      totalServices: services.length,
      cheapest: services[0],
      network: "stellar:testnet",
      paymentProtocols: ["x402", "mpp"],
      agentHint:
        "Choose the cheapest service that satisfies the task. " +
        "Prefer search ($0.01) for information retrieval. " +
        "Only use summarize ($0.02) or analyze ($0.03) if explicitly required. " +
        "All payments are real USDC on Stellar testnet via x402.",
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=30",
      },
    }
  );
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { name, price_usd, endpoint, description, protocol, method, input_param } = body;

    if (!name || !price_usd || !endpoint) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const service = await addService({
      name,
      price_usd: parseFloat(price_usd),
      endpoint,
      description: description || "",
      protocol: protocol || "x402",
      method: method || "POST",
      input_param: input_param || "text",
      stellar_network: "stellar:testnet",
      spending_policy_contract: "none", // External services might not use our policy
      is_external: true,
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
