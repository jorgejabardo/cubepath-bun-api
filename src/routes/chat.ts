import {
  streamChat,
  type ChatStreamChunk,
} from "../services/openrouter";

export type ChatRequestBody = {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  model?: string;
};

function parseBody(body: unknown): ChatRequestBody | null {
  console.log("[routes/chat] parseBody() - body recibido:", typeof body);
  if (!body || typeof body !== "object") {
    console.log("[routes/chat] parseBody() - body inválido (null o no objeto)");
    return null;
  }
  const obj = body as Record<string, unknown>;
  const messages = obj.messages;
  if (!Array.isArray(messages)) {
    console.log("[routes/chat] parseBody() - messages no es array");
    return null;
  }
  const valid = messages.every(
    (m) =>
      m &&
      typeof m === "object" &&
      typeof (m as { role?: unknown }).role === "string" &&
      typeof (m as { content?: unknown }).content === "string" &&
      ["user", "assistant", "system"].includes((m as { role: string }).role)
  );
  if (!valid) {
    console.log("[routes/chat] parseBody() - mensajes con formato inválido");
    return null;
  }
  console.log("[routes/chat] parseBody() - OK,", messages.length, "mensajes");
  return {
    messages: messages as ChatRequestBody["messages"],
    model: typeof obj.model === "string" ? obj.model : undefined,
  };
}

export async function handleChatPost(req: Request): Promise<Response> {
  console.log("[routes/chat] handleChatPost() - Request recibido", req.method, req.url);

  if (req.method !== "POST") {
    console.log("[routes/chat] Método no permitido:", req.method);
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: unknown;
  try {
    body = await req.json();
    console.log("[routes/chat] Body JSON parseado correctamente");
  } catch {
    console.log("[routes/chat] Error: Body JSON inválido");
    return Response.json(
      { error: "Body JSON inválido. Esperado: { messages: [...] }" },
      { status: 400 }
    );
  }

  const parsed = parseBody(body);
  if (!parsed) {
    console.log("[routes/chat] Error: Formato de body inválido");
    return Response.json(
      {
        error:
          "Formato inválido. Esperado: { messages: [{ role: 'user'|'assistant'|'system', content: string }], model?: string }",
      },
      { status: 400 }
    );
  }

  console.log("[routes/chat] Modo: streaming SSE | model:", parsed.model ?? "default");

  try {
    console.log("[routes/chat] Iniciando streamResponse()...");
    return streamResponse(parsed.messages, parsed.model);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    console.error("[routes/chat] Error:", message, err);
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}

function streamResponse(
  messages: ChatRequestBody["messages"],
  model?: string
): Response {
  console.log("[routes/chat] streamResponse() - Creando ReadableStream SSE");

  const encoder = new TextEncoder();
  const sendEvent = (controller: ReadableStreamDefaultController, event: string, data: unknown) => {
    controller.enqueue(encoder.encode(`event: ${event}\n`));
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const readable = new ReadableStream({
    async start(controller) {
      try {
        let lastUsage: ChatStreamChunk["usage"];
        let totalChars = 0;
        for await (const chunk of streamChat(messages, model)) {
          if (chunk.content) {
            totalChars += chunk.content.length;
            sendEvent(controller, "token", { content: chunk.content });
          }
          if (chunk.usage) {
            lastUsage = chunk.usage;
          }
        }
        console.log("[routes/chat] streamResponse() - Stream terminado, total caracteres:", totalChars);
        if (lastUsage) {
          console.log("[routes/chat] streamResponse() - Usage final:", lastUsage);
          sendEvent(controller, "usage", lastUsage);
        }
        sendEvent(controller, "done", { ok: true });
        controller.close();
        console.log("[routes/chat] streamResponse() - Controller cerrado");
      } catch (err) {
        console.error("[routes/chat] streamResponse() - Error en stream:", err);
        sendEvent(controller, "error", {
          message: err instanceof Error ? err.message : "Error en stream",
        });
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
