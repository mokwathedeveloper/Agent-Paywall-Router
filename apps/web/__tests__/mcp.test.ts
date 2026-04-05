/**
 * MCP API Tests
 * Tests for the Model Context Protocol endpoints.
 */
import { NextRequest } from "next/server";
import { GET as getTools } from "../app/api/mcp/tools/route";
import { POST as executeTool } from "../app/api/mcp/execute/route";

describe("MCP API", () => {
  describe("GET /api/mcp/tools", () => {
    it("returns the list of available tools in MCP format", async () => {
      const res = await getTools();
      expect(res.status).toBe(200);
      const body = await res.json();
      
      expect(body).toHaveProperty("tools");
      expect(Array.isArray(body.tools)).toBe(true);
      expect(body.tools.length).toBeGreaterThan(0);
      
      const searchTool = body.tools.find((t: any) => t.name === "search");
      expect(searchTool).toBeDefined();
      expect(searchTool).toHaveProperty("input_schema");
      expect(body).toHaveProperty("payment");
      expect(body.payment.protocol).toBe("x402");
    });
  });

  describe("POST /api/mcp/execute", () => {
    it("returns 400 if tool name is missing", async () => {
      const req = new NextRequest("http://localhost/api/mcp/execute", {
        method: "POST",
        body: JSON.stringify({ arguments: {} })
      });
      const res = await executeTool(req);
      expect(res.status).toBe(400);
    });

    it("returns 402 Payment Required if no receipt is provided", async () => {
      const req = new NextRequest("http://localhost/api/mcp/execute", {
        method: "POST",
        body: JSON.stringify({ 
          tool: "search", 
          arguments: { query: "test" } 
        })
      });
      
      // MCP execute proxies to the tool endpoint.
      // Without a running server, the fetch inside will throw a connection error.
      // We mock fetch to simulate the 402 response from the tool endpoint.
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        status: 402,
        ok: false,
        headers: new Headers({ "PAYMENT-REQUIRED": Buffer.from(JSON.stringify({ x402Version: 2, accepts: [] })).toString("base64") }),
        body: null,
        text: async () => JSON.stringify({ error: "Payment Required" }),
        json: async () => ({ error: "Payment Required" }),
      } as unknown as Response);

      try {
        const res = await executeTool(req);
        expect(res.status).toBe(402);
        expect(res.headers.get("PAYMENT-REQUIRED")).not.toBeNull();
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
