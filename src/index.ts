import { config } from "../config";
import { handleChatPost } from "./routes/chat";

console.log("[src/index] Iniciando servidor...");

Bun.serve({
  hostname: "0.0.0.0",
  port: config.port,
  fetch(req) {
    const url = new URL(req.url);
    console.log("[src/index] Request:", req.method, url.pathname);

    if (url.pathname === "/") {
      console.log("[src/index] -> Landing page");
      return new Response(Bun.file("src/public/index.html"), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/health") {
      console.log("[src/index] -> /health OK");
      return Response.json({ status: "ok" });
    }

    if (url.pathname === "/chat" && req.method === "POST") {
      console.log("[src/index] -> Delegando a handleChatPost");
      return handleChatPost(req);
    }

    console.log("[src/index] -> 404 Not Found");
    return new Response("Not Found", { status: 404 });
  },
});

console.log("[src/index] Server is running on http://localhost:" + config.port);
