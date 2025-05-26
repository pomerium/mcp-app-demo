export type MCPRequest = {
  user: string;
  prompt: string;
};

export type MessageStatus = "sending" | "sent" | "error";

export type Message = {
  id: string;
  content: string;
  sender: "user" | "agent";
  timestamp: Date;
  status: MessageStatus;
};

/**
 * Calls the Model Control Protocol (MCP) with the user's message
 */
export async function callMCP({ user, prompt }: MCPRequest): Promise<string> {
  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`Calling MCP for ${user}: ${prompt}`);

  // This is a mock implementation - in real usage this would call your actual MCP endpoint
  const responses = [
    "I'm analyzing your request and will have an answer shortly.",
    "Based on the information available, I would recommend exploring these options further.",
    "That's an interesting question. Let me provide some context that might help.",
    "I've processed your request and here's what I found in our knowledge base.",
    "According to our latest data, the answer to your question would be...",
    `Great question! As your AI assistant, I can tell you that ${prompt.toLowerCase().includes("weather") ? "the weather forecast shows mild temperatures with a chance of rain." : "there are multiple approaches to consider here."}`,
  ];

  // Select a response based on input to simulate some contextual awareness
  const responseIndex = Math.floor(prompt.length % responses.length);
  return Promise.resolve(responses[responseIndex]);
}

/**
 * Generates a unique ID for messages
 */
export function generateMessageId(): string {
  return Math.random().toString(36).substring(2, 15);
}