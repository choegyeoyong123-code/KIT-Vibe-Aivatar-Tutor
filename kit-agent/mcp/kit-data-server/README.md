# KIT Data MCP Server (scaffold)

## Role

- **Boundary**: LangGraph / LLM nodes never receive full DB result sets or directory dumps.
- **Access**: Agents call MCP **tools** to fetch **small, purpose-built chunks** (search hits, page slices, policy rows).
- **Transport**: stdio (default) — Cursor / Claude Desktop / custom bridge spawn this process.

## Tools (contract)

| Tool | Input | Output |
|------|--------|--------|
| `kit.chunk_search` | `{ "query": string, "limit": number }` | `{ "chunks": [{ "id", "title", "excerpt" }] }` — excerpts ≤512 chars |
| `kit.policy_lookup` | `{ "tag": string }` | `{ "snippets": string[] }` — max 5 short lines |

Implementations should query your real store (Postgres, S3 index, etc.) **inside the server** and return only shaped JSON.

## Security

- No connection string in agent prompts; only server env (`KIT_DATABASE_URL`, …).
- Log to **stderr** only (stdio JSON-RPC uses stdout).

## Run

```bash
cd mcp/kit-data-server
npm install
npm start
```

`@modelcontextprotocol/sdk`의 `registerTool`은 **Zod raw shape**만 허용합니다. 도구 입력은 `src/index.mjs`의 `inputSchema` 객체를 참고하세요.

## LangGraph bridge

See `src/lib/agent/mcp/langgraph-bridge.ts` in the Next app for the in-process stub / future JSON-RPC client.
