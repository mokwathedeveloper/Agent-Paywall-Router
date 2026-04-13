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
  rating: number;
  ratingCount: number;
  providerSplitPercentage: number;
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
    rating: s.rating,
    ratingCount: s.rating_count,
    providerSplitPercentage: s.provider_split_percentage,
  }));

  // Deterministic sorting based on score = cost * (1 - rating/5). Lower is better.
  services.sort((a, b) => {
    const scoreA = a.priceUsd * (1 - (a.rating || 0) / 5);
    const scoreB = b.priceUsd * (1 - (b.rating || 0) / 5);
    return scoreA - scoreB;
  });

  return NextResponse.json(
    {
      services: services,
      totalServices: services.length,
      bestValue: services[0], // Formerly cheapest, now best value
      network: "stellar:testnet",
      paymentProtocols: ["x402", "mpp"],
      agentHint:
        "Choose the service that provides the best combination of cost and reliability score. " +
        "Services are already sorted by the optimal score = cost * (1 - rating/5). " +
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
    const { name, price_usd, endpoint, description, protocol, method, input_param, provider_split_percentage } = body;

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
      spending_policy_contract: "none",
      is_external: true,
      provider_split_percentage: provider_split_percentage ? parseFloat(provider_split_percentage) : 0.7,
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing service ID" }, { status: 400 });
    }

    const dbModule = await import("@/lib/db");
    const success = await dbModule.deleteService(id);

    if (success) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Service not found or cannot be deleted" }, { status: 403 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
