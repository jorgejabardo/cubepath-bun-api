import { OpenRouter } from "@openrouter/sdk";
import { config } from "../../config";

console.log("[services/openrouter] Inicializando cliente OpenRouter...");

const openrouter = config.openRouter.apiKey
  ? new OpenRouter({
      apiKey: config.openRouter.apiKey,
    })
  : null;

if (openrouter) {
  console.log("[services/openrouter] Cliente OpenRouter listo ✓");
} else {
  console.log("[services/openrouter] Cliente no inicializado (sin API key)");
}

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatStreamChunk = {
  content?: string | null;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;
  };
};

export async function* streamChat(
  messages: ChatMessage[],
  model = "openrouter/free"
): AsyncGenerator<ChatStreamChunk> {
  console.log("[services/openrouter] streamChat() llamado", {
    numMessages: messages.length,
    model,
  });

  if (!openrouter) {
    console.error("[services/openrouter] Error: OPENROUTER_API_KEY no configurada");
    throw new Error("OPENROUTER_API_KEY no está configurada en .env");
  }

  console.log("[services/openrouter] Enviando request a OpenRouter...");
  const stream = await openrouter.chat.send({
    chatGenerationParams: {
      model,
      messages,
      stream: true,
    },
  });
  console.log("[services/openrouter] Stream recibido, iterando chunks...");

  let chunkCount = 0;
  for await (const chunk of stream) {
    chunkCount++;
    const content = chunk.choices[0]?.delta?.content;
    const usage = chunk.usage;

    if (content) {
      console.log(
        `[services/openrouter] Chunk #${chunkCount}: "${content.slice(0, 40)}${content.length > 40 ? "..." : ""}"`
      );
    }
    if (usage) {
      console.log("[services/openrouter] Usage recibido:", usage);
    }

    yield {
      ...(content !== undefined && content !== null && { content }),
      ...(usage && { usage }),
    };
  }

  console.log(`[services/openrouter] streamChat() completado. Total chunks: ${chunkCount}`);
}
