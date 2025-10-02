# MCP-UI Rendering Troubleshooting

## Problem Statement

MCP tool calls (e.g., `chess_move`) execute successfully, but MCP-UI resources fail to render in the frontend. The UI should fetch and display visual representations of tool results, but these requests are failing.

## Root Cause

The frontend was attempting to directly fetch MCP-UI resources from the MCP server URL (`https://chess.demo.maisonlab.dev/`), which caused CORS errors:

```
Access to fetch at 'https://chess.demo.maisonlab.dev/' from origin
'https://devchat.demo.maisonlab.dev' has been blocked by CORS policy
```

## Solution Approach

Created a backend proxy endpoint `/api/mcp-call` to avoid CORS issues by having the frontend call its own backend, which then proxies requests to the MCP server.

### Files Created/Modified

1. **`/src/routes/api/mcp-call.ts`** (CREATED)
   - Backend proxy endpoint for MCP JSON-RPC calls
   - Accepts: `serverUrl`, `toolName`, `arguments`, `itemId`
   - Validates requests with Zod schema
   - Forwards authentication to MCP server

2. **`/src/hooks/useStreamingChat.ts:612`** (MODIFIED)
   - Changed from direct MCP server fetch to proxy endpoint
   - Now calls `/api/mcp-call` with `credentials: 'include'`

## Authentication Attempts

### Attempt 1: Bearer Token Only
```typescript
headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${bearerToken}`,
}
```
**Result:** ❌ 404 - "Bad Request: No valid session ID provided"

### Attempt 2: Cookies Only
```typescript
headers: {
  'Content-Type': 'application/json',
  ...(cookies && { Cookie: cookies }),
}
```
**Result:** ❌ 401 Unauthorized (Pomerium error page)

### Attempt 3: Bearer Token + Cookies (Current)
```typescript
headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${bearerToken}`,
  ...(cookies && { Cookie: cookies }),
}
```
**Result:** ❌ 404 - "Bad Request: No valid session ID provided"

## Debug Findings

Server logs confirm:
- ✅ Authorization header is present (`Bearer sometoken`)
- ✅ Cookies are present
- ✅ Proxy successfully forwards both to MCP server
- ❌ MCP server still rejects with "No valid session ID"

```
[MCP Proxy] Request headers: {
  authorization: 'Bearer sometoken',
  cookie: 'present',
  'x-pomerium-assertion': 'missing'
}
[MCP Proxy] Forwarding cookies: yes
```

## Current Status

**BLOCKED** - Authentication is reaching the MCP server correctly, but the server is not accepting it. The issue is likely:

1. **MCP Server Configuration** - Server may require specific session handling
2. **Pomerium Routing** - Session may need to be established differently for MCP tool calls vs. regular API calls
3. **Session Establishment** - MCP server might require an initial handshake or different session format

## Next Steps

1. Check MCP server logs to see what authentication it's receiving
2. Review Pomerium configuration for MCP server routes
3. Verify if MCP tool calls require a different authentication flow than regular API endpoints
4. Check if `/.pomerium/mcp/connect` flow needs to be triggered before tool calls
5. Compare working `/api/chat` authentication flow with failing `/api/mcp-call` flow

## Reference: Working Authentication

The `/api/chat` endpoint successfully authenticates with MCP servers using the same bearer token approach:

```typescript
// /src/routes/api/chat.ts:86
const bearerToken = request.headers.get('Authorization')?.split(' ')[1]

// /src/routes/api/chat.ts:184
Authorization: `Bearer ${bearerToken}`
```

This works for streaming chat and tool execution but fails for MCP-UI resource fetching, suggesting a difference in how Pomerium handles these requests.
