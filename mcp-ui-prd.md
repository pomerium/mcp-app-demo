# Product Requirements Document: MCP-UI Integration for mcp-app-demo

## Executive Summary

This PRD outlines the requirements for adding MCP-UI rendering capabilities to the `mcp-app-demo` project, enabling it to display rich, interactive UI components returned by MCP servers (like the chess board from `chess_mcp`).

## Background

### Current State

- `mcp-app-demo` is a React-based MCP client using OpenAI for AI chat, secured by Pomerium
- Currently only displays text content from MCP tool responses
- Uses TanStack Router, TanStack Query, shadcn/ui, and Tailwind CSS
- The chess MCP server returns both text content and UI resources (interactive chess board)
- UI resources work in nanobot MCP client but are not rendered in mcp-app-demo

### Problem Statement

MCP servers can return rich UI resources using the `@mcp-ui/server` package, but `mcp-app-demo` lacks the capability to detect and render these resources. This limits the user experience to text-only interactions, even when servers provide interactive UIs.

## Goals

### Primary Goals

1. Enable rendering of MCP-UI resources in tool responses
2. Support interactive UI components with bidirectional communication (UI → tool calls)
3. Maintain existing text-based rendering as fallback
4. Ensure security through proper iframe sandboxing

### Secondary Goals

1. Provide consistent styling that matches mcp-app-demo's design system
2. Support different UI resource types (HTML, external URLs, remote DOM)
3. Handle UI metadata like preferred frame sizes
4. Gracefully degrade for non-UI resources

### Non-Goals

1. Custom UI component library development (use @mcp-ui/client)
2. Support for legacy or non-standard UI formats
3. Production-grade chess engine implementation (use existing chess libraries)

## Technical Specification

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ mcp-app-demo (React Client)                             │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ Chat Interface Component                       │    │
│  │                                                 │    │
│  │  ┌──────────────────────────────────────────┐ │    │
│  │  │ Message Renderer                         │ │    │
│  │  │                                          │ │    │
│  │  │  • Detects content type                 │ │    │
│  │  │  • Text → TextContent component         │ │    │
│  │  │  • UI Resource → UIResourceRenderer     │ │    │
│  │  │                                          │ │    │
│  │  │  ┌────────────────────────────────────┐ │ │    │
│  │  │  │ UIResourceRenderer                 │ │ │    │
│  │  │  │ (@mcp-ui/client)                   │ │ │    │
│  │  │  │                                    │ │ │    │
│  │  │  │  • Renders iframe with UI         │ │ │    │
│  │  │  │  • Handles postMessage events     │ │ │    │
│  │  │  │  • Triggers tool calls via        │ │ │    │
│  │  │  │    onUIAction callback            │ │ │    │
│  │  │  └────────────────────────────────────┘ │ │    │
│  │  └──────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```typescript
// Proposed structure
<ChatInterface>
  <MessageList>
    {messages.map(message => (
      <Message>
        {message.content.map(content => (
          <ContentRenderer content={content}>
            {content.type === 'text' && <TextContent {...content} />}
            {content.type === 'image' && <ImageContent {...content} />}
            {content.type === 'resource' && content.resource.uri?.startsWith('ui://') && (
              <UIResourceRenderer
                resource={content.resource}
                onUIAction={handleUIAction}
              />
            )}
          </ContentRenderer>
        ))}
      </Message>
    ))}
  </MessageList>
</ChatInterface>
```

### Dependencies

**New Dependencies:**

```json
{
  "dependencies": {
    "@mcp-ui/client": "^latest"
  }
}
```

### Data Structures

**MCP Tool Response with UI Resource:**

```typescript
interface ToolResponse {
  content: Content[]
}

type Content = TextContent | ImageContent | ResourceContent

interface ResourceContent {
  type: 'resource'
  resource: UIResource
}

interface UIResource {
  uri: string // Format: "ui://chess_board/{fen}" or similar
  mimeType?: string
  text?: string // Inline HTML content
  blob?: string // Base64 encoded content
  metadata?: Record<string, unknown>
  uiMetadata?: {
    'preferred-frame-size'?: [string, string] // e.g., ["400px", "400px"]
    'initial-render-data'?: unknown
  }
}
```

**UI Action Event:**

```typescript
interface UIAction {
  type: 'tool'
  payload: {
    toolName: string
    params: Record<string, unknown>
  }
}
```

### Implementation Requirements

#### Phase 1: Basic UI Resource Detection and Rendering

**1.1 Install @mcp-ui/client Package**

```bash
npm install @mcp-ui/client
```

**1.2 Create ContentRenderer Component**

Location: `src/components/chat/ContentRenderer.tsx`

```typescript
import { UIResourceRenderer } from '@mcp-ui/client';
import { TextContent } from './TextContent';
import { ImageContent } from './ImageContent';
import type { Content } from '@/types/mcp';

interface ContentRendererProps {
  content: Content;
  onUIAction?: (action: UIAction) => void;
}

export function ContentRenderer({ content, onUIAction }: ContentRendererProps) {
  // Detect content type and render appropriately
  if (content.type === 'text') {
    return <TextContent {...content} />;
  }

  if (content.type === 'image') {
    return <ImageContent {...content} />;
  }

  if (content.type === 'resource' && content.resource.uri?.startsWith('ui://')) {
    return (
      <UIResourceRenderer
        resource={content.resource}
        onUIAction={onUIAction}
      />
    );
  }

  // Fallback for unsupported content types
  return <div>Unsupported content type: {content.type}</div>;
}
```

**1.3 Update Message Component**

Location: `src/components/chat/Message.tsx` (or equivalent)

```typescript
import { ContentRenderer } from './ContentRenderer';

export function Message({ message, onToolCall }) {
  const handleUIAction = async (action: UIAction) => {
    if (action.type === 'tool') {
      await onToolCall(action.payload.toolName, action.payload.params);
    }
  };

  return (
    <div className="message">
      <div className="message-role">{message.role}</div>
      <div className="message-content">
        {message.content.map((content, index) => (
          <ContentRenderer
            key={index}
            content={content}
            onUIAction={handleUIAction}
          />
        ))}
      </div>
    </div>
  );
}
```

**1.4 Type Definitions**

Location: `src/types/mcp.ts`

```typescript
export interface UIAction {
  type: 'tool'
  payload: {
    toolName: string
    params: Record<string, unknown>
  }
}

export interface UIResource {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
  metadata?: Record<string, unknown>
  uiMetadata?: {
    'preferred-frame-size'?: [string, string]
    'initial-render-data'?: unknown
  }
}

export interface ResourceContent {
  type: 'resource'
  resource: UIResource
}

export interface TextContent {
  type: 'text'
  text: string
}

export interface ImageContent {
  type: 'image'
  data: string
  mimeType: string
}

export type Content = TextContent | ImageContent | ResourceContent
```

#### Phase 2: Styling and Layout Integration

**2.1 CSS Customization**

Location: `src/styles/mcp-ui.css`

```css
/* Ensure UI resources integrate with app design system */
.mcp-ui-resource {
  border-radius: var(--radius);
  border: 1px solid hsl(var(--border));
  overflow: hidden;
  margin: 1rem 0;
}

.mcp-ui-resource iframe {
  border: none;
  display: block;
}

/* Responsive sizing based on preferred-frame-size metadata */
.mcp-ui-resource[data-preferred-width] {
  max-width: 100%;
  width: var(--preferred-width);
}

.mcp-ui-resource[data-preferred-height] {
  height: var(--preferred-height);
}
```

**2.2 Wrapper Component for Styling**

Location: `src/components/chat/StyledUIResource.tsx`

```typescript
import { UIResourceRenderer } from '@mcp-ui/client';
import type { UIResource, UIAction } from '@/types/mcp';

interface StyledUIResourceProps {
  resource: UIResource;
  onUIAction?: (action: UIAction) => void;
}

export function StyledUIResource({ resource, onUIAction }: StyledUIResourceProps) {
  const preferredSize = resource.uiMetadata?.['preferred-frame-size'];
  const style = preferredSize ? {
    '--preferred-width': preferredSize[0],
    '--preferred-height': preferredSize[1],
  } as React.CSSProperties : {};

  return (
    <div
      className="mcp-ui-resource"
      style={style}
      data-preferred-width={preferredSize?.[0]}
      data-preferred-height={preferredSize?.[1]}
    >
      <UIResourceRenderer
        resource={resource}
        onUIAction={onUIAction}
      />
    </div>
  );
}
```

#### Phase 3: Interactive Tool Calls from UI

**3.1 Tool Call Handler Integration**

The `onUIAction` callback needs to integrate with the existing tool call mechanism in mcp-app-demo.

Location: `src/hooks/useMCPToolCall.ts` (or equivalent)

```typescript
export function useMCPToolCall(serverLabel: string) {
  const [isLoading, setIsLoading] = useState(false)

  const callTool = async (
    toolName: string,
    params: Record<string, unknown>,
  ) => {
    setIsLoading(true)
    try {
      // Use existing MCP client logic to call tool
      const response = await mcpClient.callTool({
        serverLabel,
        toolName,
        arguments: params,
      })

      return response
    } catch (error) {
      console.error('Tool call failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return { callTool, isLoading }
}
```

**3.2 Message Origin Validation**

For security, validate postMessage origins:

```typescript
// In UIResourceRenderer wrapper or custom handler
const handleUIAction = (action: UIAction) => {
  // Validate action structure
  if (!action || action.type !== 'tool') {
    console.warn('Invalid UI action:', action)
    return
  }

  if (!action.payload?.toolName) {
    console.warn('Missing tool name in UI action')
    return
  }

  // Call tool through validated handler
  onUIAction?.(action)
}
```

### Security Considerations

1. **Iframe Sandboxing**: `@mcp-ui/client` should handle this, but verify sandbox attributes
2. **Message Origin Validation**: Only accept postMessages from expected origins
3. **Content Security Policy**: Ensure CSP allows iframe embedding with appropriate restrictions
4. **XSS Prevention**: Never use `dangerouslySetInnerHTML` directly; rely on `@mcp-ui/client`
5. **Tool Call Authorization**: Ensure UI-triggered tool calls go through same auth flow as manual calls

### Error Handling

**Error States to Handle:**

1. UI resource fails to load
2. Invalid UI resource format
3. Tool call from UI fails
4. Network errors during tool execution
5. Unsupported UI resource type

**Error UI Component:**

```typescript
export function UIResourceError({ error, resource }: { error: Error; resource: UIResource }) {
  return (
    <div className="ui-resource-error">
      <AlertCircle className="h-4 w-4" />
      <div>
        <p className="font-medium">Failed to load UI resource</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <details className="mt-2">
          <summary className="text-xs cursor-pointer">Debug Info</summary>
          <pre className="text-xs mt-1 p-2 bg-muted rounded">
            {JSON.stringify(resource, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
```

### Testing Strategy

#### Unit Tests

- `ContentRenderer` correctly routes content types
- `StyledUIResource` applies correct styles based on metadata
- Error states render appropriately

#### Integration Tests

- UI resource with embedded HTML renders correctly
- Tool calls triggered from UI execute properly
- Multiple UI resources in same conversation work independently

#### E2E Tests

- Complete flow: MCP server returns UI → Client renders → User interacts → Tool called → Response shown
- Chess game scenario: Start game → Make move via drag-drop → Board updates

### Performance Considerations

1. **Lazy Loading**: Load `@mcp-ui/client` only when needed
2. **Iframe Management**: Properly cleanup iframes when messages are removed
3. **Message Batching**: If multiple UI actions fire rapidly, debounce/throttle tool calls
4. **Memory Management**: Monitor iframe memory usage for long conversations

### Accessibility

1. **Keyboard Navigation**: Ensure iframes are keyboard accessible
2. **Screen Reader Support**: Provide text alternatives for UI resources
3. **Focus Management**: Handle focus properly when interacting with iframes
4. **ARIA Labels**: Add appropriate labels to UI resource containers

## Success Metrics

### Functional Metrics

- ✅ Chess board renders and displays current game state
- ✅ Drag-and-drop moves trigger chess_move tool correctly
- ✅ Board updates reflect game state after each move
- ✅ Text content still renders for non-UI responses
- ✅ Multiple UI resources can coexist in conversation

### Performance Metrics

- UI resource render time < 500ms
- Tool call latency from UI action < 1s
- No memory leaks after 50+ messages with UI resources

### Quality Metrics

- Zero XSS vulnerabilities
- Passes WCAG 2.1 AA accessibility standards
- Works in Chrome, Firefox, Safari, Edge (latest 2 versions)

## Timeline & Milestones

### Phase 1: Core Implementation (Week 1)

- Day 1-2: Install dependencies, create type definitions
- Day 3-4: Implement ContentRenderer and basic UI resource detection
- Day 5: Integration testing with chess MCP server

### Phase 2: Polish & Styling (Week 2)

- Day 1-2: Styling integration with existing design system
- Day 3-4: Error handling and edge cases
- Day 5: Accessibility improvements

### Phase 3: Server-Side MCP-UI Support (Week 3)

- Day 1-2: Add @mcp-ui/server to chess_mcp server
- Day 3-4: Implement UI resource generation for chess board
- Day 5: End-to-end testing with interactive chess moves

### Phase 4: Production Readiness (Week 4)

- Day 1-2: Performance optimization
- Day 3-4: Security audit
- Day 5: Documentation and examples

## Server-Side Implementation

### Phase 3 Requirements: Chess MCP Server with MCP-UI

The chess MCP server needs to be updated to return UI resources instead of plain text responses. This enables interactive chess board rendering in the client.

#### 3.1 Add @mcp-ui/server Dependency

The chess server should use `@mcp-ui/server` to generate UI resources:

```bash
npm install @mcp-ui/server chess.js
```

#### 3.2 Chess Board UI Resource Generation

When `chess_move` tool is called, return a UI resource with:

1. **URI format**: `ui://chess_board/{fen}` where FEN is the current board position
2. **HTML content**: Interactive chess board using chessboard.js
3. **UI Metadata**: Preferred frame size of 400x400px
4. **postMessage integration**: Send moves back to client via `window.parent.postMessage`

#### 3.3 Implementation Pattern

```typescript
import { createUIResource } from '@mcp-ui/server'

// After a move is made
const fen = chess.fen() // Current board position

const uiResource = createUIResource({
  uri: `ui://chess_board/${fen}`,
  html: generateChessBoardHTML(fen),
  metadata: {
    'preferred-frame-size': ['400px', '400px']
  }
})

return {
  content: [
    {
      type: 'text',
      text: `Move executed. Current position: ${fen}`
    },
    {
      type: 'resource',
      resource: uiResource
    }
  ]
}
```

#### 3.4 Interactive Chess Board HTML

The HTML should:
- Use chessboard.js for rendering
- Enable drag-and-drop for moves
- Send moves via postMessage with format: `{type: 'tool', payload: {toolName: 'chess_move', params: {move: 'e2e4'}}}`
- Display current board position from FEN

#### 3.5 Tool Response Structure

Every tool call response should include both:
1. Text description of the move/game state
2. UI resource with interactive board

This allows graceful degradation if the client doesn't support UI resources.

## Open Questions

1. Should UI resources be collapsible to save screen space?
2. Do we need a gallery view for multiple UI resources?
3. Should there be a "reload UI" button for debugging?
4. How to handle UI resources that require authentication?
5. Should we support full-screen mode for UI resources?

## Appendix

### References

- [MCP-UI Documentation](https://mcpui.dev/)
- [MCP-UI GitHub](https://github.com/idosal/mcp-ui)
- [MCP Specification - Resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources)
- [Shopify Engineering: MCP-UI Blog Post](https://shopify.engineering/mcp-ui-breaking-the-text-wall)

### Example: Chess MCP Server UI Resource

```typescript
// What the chess server returns
{
  type: "resource",
  resource: {
    uri: "ui://chess_board/rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    text: `<!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.css" />
        </head>
        <body>
          <div id="myBoard" style="width: 400px"></div>
          <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
          <script src="https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js"></script>
          <script>
            var board = Chessboard('myBoard', {
              position: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
              draggable: true,
              onDrop: function(source, target) {
                window.parent.postMessage({
                  type: 'tool',
                  payload: {
                    toolName: 'chess_move',
                    params: { move: source + '-' + target }
                  }
                }, '*');
              }
            });
          </script>
        </body>
      </html>`,
    uiMetadata: {
      "preferred-frame-size": ["400px", "400px"]
    }
  }
}
```

### Related Issues & PRs

- (To be filled in during implementation)

### Feedback & Iteration

- After initial implementation, gather user feedback on:
  - UI resource discovery (is it obvious what's interactive?)
  - Performance with many UI resources
  - Mobile experience
  - Accessibility with assistive technologies
