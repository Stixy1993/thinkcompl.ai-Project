import { anthropic } from "@ai-sdk/anthropic";
import { convertToCoreMessages, streamText, generateText } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages, model, stream = true } = await req.json();
  
  if (stream === false) {
    // Non-streaming mode - return simple JSON response
    const result = await generateText({
      model: anthropic(model || "claude-3-5-sonnet-20240620"),
      messages: convertToCoreMessages(messages),
      system: "You are a helpful AI assistant",
    });
    
    return new Response(JSON.stringify({ content: result.text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } else {
    // Streaming mode
    const result = await streamText({
      model: anthropic(model || "claude-3-5-sonnet-20240620"),
      messages: convertToCoreMessages(messages),
      system: "You are a helpful AI assistant",
    });

    return result.toDataStreamResponse();
  }
} 