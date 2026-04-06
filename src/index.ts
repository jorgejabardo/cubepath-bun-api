import { config } from "../config";
import { handleChatPost } from "./routes/chat";

console.log("[src/index] Iniciando servidor...");

Bun.serve({
  hostname: "0.0.0.0",
  port: config.port,
  fetch(req) {
    return new Response("Conexión exitosa");
  },
});

console.log("[src/index] Server is running on http://localhost:" + config.port);
