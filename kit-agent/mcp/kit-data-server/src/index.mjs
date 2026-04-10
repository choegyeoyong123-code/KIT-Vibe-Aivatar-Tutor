/**
 * KIT MCP data server — stdio JSON-RPC.
 * Replace stub handlers with real DB / object-store queries.
 * Use console.error only (stdout is reserved for MCP).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "kit-data",
  version: "0.1.0",
});

server.registerTool(
  "kit.chunk_search",
  {
    title: "KIT chunk search",
    description:
      "Returns short text excerpts matching a query — never full table rows.",
    inputSchema: {
      query: z.string().describe("Natural language or keyword query"),
      limit: z.coerce.number().int().min(1).max(20).optional().default(5),
    },
  },
  async ({ query, limit }) => {
    const cap = typeof limit === "number" ? limit : 5;
    const chunks = [
      {
        id: "stub-1",
        title: "(stub) KIT lecture index",
        excerpt: `No backend wired — query was: ${String(query).slice(0, 80)}`,
      },
    ].slice(0, cap);
    return {
      content: [{ type: "text", text: JSON.stringify({ chunks }) }],
    };
  },
);

server.registerTool(
  "kit.policy_lookup",
  {
    title: "KIT policy snippet",
    description: "Returns at most 5 short policy lines for a tag.",
    inputSchema: {
      tag: z.string().describe("Policy tag or category"),
    },
  },
  async ({ tag }) => {
    const snippets = [
      `(stub) policy tag=${String(tag).slice(0, 40)} — connect vector DB here`,
    ];
    return {
      content: [{ type: "text", text: JSON.stringify({ snippets }) }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
