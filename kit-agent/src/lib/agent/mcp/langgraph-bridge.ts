/**
 * MCP ↔ LangGraph bridge (scaffold).
 *
 * - Nodes must not paste raw SQL rows into `messages`; call MCP tools and inject only
 *   the returned `chunks` / `snippets` (short strings).
 * - Production: spawn `mcp/kit-data-server` or use streamable HTTP MCP; exchange JSON-RPC.
 * - This module stays dependency-free so `next build` never requires `@modelcontextprotocol/sdk`.
 */

export type KitDataChunk = { id: string; title: string; excerpt: string };

export type KitMcpToolCall = {
  tool: "kit.chunk_search" | "kit.policy_lookup";
  args: Record<string, string | number>;
};

/**
 * Placeholder — replace with MCP client (stdio subprocess or HTTP).
 * Returns empty until the MCP server is wired.
 */
export async function invokeKitDataTool(_call: KitMcpToolCall): Promise<{
  chunks?: KitDataChunk[];
  snippets?: string[];
}> {
  return {};
}

/**
 * Optional: format MCP chunks for MASTER CONTEXT (keep each excerpt short).
 */
export function formatChunksForPrompt(chunks: KitDataChunk[], maxItems = 5): string {
  return chunks
    .slice(0, maxItems)
    .map((c) => `- **${c.title}** (${c.id}): ${c.excerpt}`)
    .join("\n");
}
