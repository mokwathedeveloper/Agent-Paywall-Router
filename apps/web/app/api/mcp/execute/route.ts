import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sanitizeLog } from "@/lib/services/security";

const ToolNameSchema = z.enum(["search", "summarize", "analyze"]);

const SearchArgsSchema = z
  .object({
    query: z.string().optional(),
    text: z.string().optional(),
  })
  .refine((v) => Boolean((v.query ?? v.text)?.trim()), {
    message: "Either 'query' or 'text' must be provided for search.",
  });

const SummarizeArgsSchema = z.object({
  text: z.string().min(1, "Field 'text' must be a non-empty string."),
});

const AnalyzeArgsSchema = z.object({
  text: z.string().min(1, "Field 'text' must be a non-empty string."),
});

type AllowedTool = z.infer<typeof ToolNameSchema>;

/**
 * POST /api/mcp/execute
 * 
 * Executes an MCP tool. 
 * This endpoint acts as a proxy to the underlying tool endpoints,
 * which are protected by x402 paywalls.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { tool, arguments: args } = body as { tool?: unknown; arguments?: unknown };

  const parsedTool = ToolNameSchema.safeParse(tool);
  if (!parsedTool.success) {
    return NextResponse.json({ error: "Invalid or missing 'tool' name" }, { status: 400 });
  }

  const toolName: AllowedTool = parsedTool.data;
  const argsObj = (args ?? {}) as Record<string, unknown>;

  // Validate tool arguments to prevent proxying arbitrary payloads/URLs.
  const parsedArgs =
    toolName === "search"
      ? SearchArgsSchema.safeParse(argsObj)
      : toolName === "summarize"
        ? SummarizeArgsSchema.safeParse(argsObj)
        : AnalyzeArgsSchema.safeParse(argsObj);

  if (!parsedArgs.success) {
    return NextResponse.json({ error: "Invalid tool arguments" }, { status: 400 });
  }

  const safeArgs = parsedArgs.data;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const targetUrl =
    toolName === "search"
      ? (() => {
          const query = (safeArgs as { query?: string; text?: string }).query ?? (safeArgs as { query?: string; text?: string }).text ?? "";
          return `${baseUrl}/api/tools/search?q=${encodeURIComponent(query)}`;
        })()
      : `${baseUrl}/api/tools/${toolName}`;

  // Proxy the request to the tool endpoint, preserving the x402-receipt header
  const receipt = req.headers.get("x402-receipt");
  
  try {
    const res = await fetch(targetUrl, {
      method: toolName === "search" ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(receipt ? { "x402-receipt": receipt } : {}),
      },
      body: toolName === "search" ? undefined : JSON.stringify(safeArgs),
    });

    // If the tool endpoint returns 402, proxy it back to the MCP client
    if (res.status === 402) {
      const x402Header = res.headers.get("PAYMENT-REQUIRED");
      return new NextResponse(res.body, {
        status: 402,
        headers: {
          "Content-Type": "application/json",
          "PAYMENT-REQUIRED": x402Header || "",
          "Access-Control-Allow-Origin": "*",
        }
      });
    }

    // For any other non-2xx status, fail-closed and preserve status code.
    // This ensures MCP clients get correct HTTP semantics (e.g., 403 Security violation).
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Tool call failed with status ${res.status}`, detail: errorBody },
        {
          status: res.status,
          headers: { "Access-Control-Allow-Origin": "*" },
        }
      );
    }

    const data = await res.json();
    return NextResponse.json({
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2)
        }
      ]
    }, {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    console.error(`MCP execution failed for ${sanitizeLog(toolName)}:`, sanitizeLog(err));
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Support CORS for external agents
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x402-receipt",
    }
  });
}
