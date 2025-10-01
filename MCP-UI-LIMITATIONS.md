# MCP-UI Implementation Limitations

## Summary

The MCP-UI client-side implementation in mcp-app-demo is **fully functional** and ready to render interactive UI resources. However, **OpenAI's MCP implementation does not pass through UI resources** from MCP tool responses, preventing the feature from working end-to-end with OpenAI's API.

## What Works ✅

- **Client-side MCP-UI support**: Fully implemented and tested
  - `@mcp-ui/client` integration
  - UI resource detection (`ui://` URIs)
  - Interactive iframe rendering with postMessage
  - Tool call handling from UI interactions
  - Error handling and fallback rendering
  - Styling integrated with design system

- **Server-side MCP-UI support**: Chess MCP server returns UI resources correctly
  - Located at `/Users/nicktaylor/dev/oss/chess`
  - Uses `@mcp-ui/server` to generate interactive chess boards
  - Returns proper `content` arrays with both text and UI resources

## What Doesn't Work ❌

**OpenAI's Response Streaming API** strips out UI resources from MCP tool responses.

### Evidence

When the chess server returns:
```typescript
{
  content: [
    { type: "text", text: "Current board state..." },
    {
      type: "resource",
      resource: {
        uri: "ui://chess_board/...",
        text: "<html>...</html>", // Interactive board
        uiMetadata: { "preferred-frame-size": ["400px", "400px"] }
      }
    }
  ]
}
```

OpenAI's API only passes through:
```json
{
  "output": "Current board state:\\n FEN: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1\\n..."
}
```

The `resource` object with UI content is completely missing from OpenAI's response.

### Stream Analysis

From `/api/chat` output:
```
t:{"type":"mcp_call_completed",
   "itemId":"mcp_00710f83...",
   "output":"Current board state:\\n FEN: rnbqkbnr..."} ← Only text
```

No `content` array, no `resource` objects.

## Root Cause

OpenAI's Responses API MCP integration appears to:
1. Call MCP tools correctly ✅
2. Receive the full `content` array from MCP servers ✅
3. **Extract only text content** for the AI response ❌
4. Discard `resource` objects entirely ❌

This is likely an intentional design decision or unimplemented feature in OpenAI's MCP support.

## How Nanobot Solves This

After analyzing [nanobot's source code](https://github.com/nanobot-ai/nanobot), we discovered they **don't use OpenAI's native MCP integration**. Instead:

1. **Nanobot acts as an intermediary**
   - Directly calls MCP servers (not through OpenAI)
   - Receives full `Content` arrays including UI resources
   - Manually orchestrates tool calls

2. **Content Conversion** (`pkg/llm/responses/translate.go:331-385`)
   ```go
   // For each item in MCP response Content array
   for _, output := range toolCallResult.Output.Content {
       inputItemContent, ok := contentToInputItem(output)
       // Converts to OpenAI format and sends as user message
   }
   ```

3. **No Dependence on OpenAI MCP**
   - Nanobot uses OpenAI for LLM inference only
   - All MCP orchestration happens in nanobot's Go code
   - UI resources are handled before/after OpenAI calls

### Architecture Comparison

**mcp-app-demo (current)**:
```
User → mcp-app-demo → OpenAI (with MCP) → MCP Servers
                        ↓
                   Text only ❌
```

**nanobot**:
```
User → nanobot UI → nanobot server → OpenAI (no MCP)
                           ↓              ↓
                     MCP Servers    Text responses
                           ↓
                   Full Content ✅
```

## Potential Solutions

### Option 1: Wait for OpenAI Support
**Status**: Blocked on OpenAI
**Timeline**: Unknown

Request OpenAI to pass through the full `content` array from MCP tool responses.

### Option 2: Direct MCP Server Integration
**Status**: Possible but complex
**Effort**: High

Instead of using OpenAI's MCP integration, connect directly to MCP servers:
- Bypass OpenAI for tool calls
- Have the AI provide instructions
- Call MCP servers directly from client
- Render UI resources from direct responses

**Pros**: Full control, works immediately
**Cons**: Loses OpenAI's tool calling orchestration, requires reimplementation

### Option 3: Hybrid Approach
**Status**: Feasible
**Effort**: Medium

When OpenAI makes a tool call:
1. Let OpenAI handle the orchestration
2. Detect tool completion
3. Make a parallel request to the MCP server to fetch UI resources
4. Render UI alongside OpenAI's text response

**Pros**: Leverages both systems
**Cons**: Duplicate requests, complexity in state management

### Option 4: Server-Side Rendering
**Status**: Feasible
**Effort**: Low-Medium

- Intercept MCP responses on the server side
- Extract UI resources before passing to OpenAI
- Stream UI resources separately to the client
- Client renders both text (from OpenAI) and UI (from server)

**Pros**: Clean separation, works with current architecture
**Cons**: Requires server-side modification

## Recommendation

**Option 5: Nanobot-Style Architecture** (Recommended)

Based on nanobot's proven approach, implement MCP orchestration on the server:

1. **Remove OpenAI's MCP integration**
   - Use OpenAI purely for LLM inference
   - Don't pass MCP servers to OpenAI

2. **Add server-side MCP client** (`src/routes/api/chat.ts`)
   ```typescript
   // When OpenAI requests a tool call:
   const mcpResponse = await mcpClient.callTool(serverUrl, toolName, params)
   // mcpResponse.content has full array including UI resources

   // Stream UI resources to client immediately
   streamUIResources(mcpResponse.content)

   // Send text content back to OpenAI as user message
   openai.chat.completions.create({
     messages: [...previousMessages, {
       role: "user",
       content: extractTextContent(mcpResponse.content)
     }]
   })
   ```

3. **Benefits**:
   - Full control over MCP responses ✅
   - UI resources preserved ✅
   - Works with any LLM provider ✅
   - Matches nanobot's proven pattern ✅

**Option 4** (Server-Side Interception) is simpler but still depends on OpenAI's incomplete MCP support.

**Option 5** gives complete control and is the proven approach.

## Files Modified for MCP-UI

### Client Implementation
- ✅ `src/types/mcp.ts` - Type definitions
- ✅ `src/components/UIResourceError.tsx` - Error display
- ✅ `src/components/StyledUIResource.tsx` - UI wrapper
- ✅ `src/components/ContentRenderer.tsx` - Content router
- ✅ `src/components/ToolCallMessage.tsx` - Tool UI rendering
- ✅ `src/hooks/useStreamingChat.ts` - Content field support
- ✅ `src/components/Chat.tsx` - UI action handler
- ✅ `src/styles.css` - MCP-UI styles
- ✅ Tests and Storybook stories

### Server Status
- ✅ Chess MCP server has full UI support (`@mcp-ui/server`)
- ❌ OpenAI API doesn't pass through UI resources

## Next Steps

1. **Document limitation** ✅ (this file)
2. **Update PRD** with OpenAI limitation
3. **Implement Option 4** if needed
4. **Contact OpenAI** to request MCP UI resource support

## Testing

To verify client-side implementation works:

1. Create mock UI resource:
```typescript
const mockResource = {
  type: 'resource',
  resource: {
    uri: 'ui://test',
    text: '<html><body><h1>Test</h1></body></html>',
    uiMetadata: { 'preferred-frame-size': ['400px', '300px'] }
  }
}
```

2. Manually inject into stream buffer
3. Verify rendering works correctly

The client-side implementation is production-ready and waiting for server support.
