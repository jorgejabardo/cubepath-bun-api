console.log("[config] Cargando configuración...");

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.warn(
    "[config] OPENROUTER_API_KEY no está definida. El endpoint /chat no funcionará."
  );
} else {
  console.log("[config] OPENROUTER_API_KEY encontrada ✓");
}

export const config = {
  port: Number(process.env.PORT) || 3000,
  openRouter: {
    apiKey: apiKey ?? "",
  },
} as const;

console.log("[config] Puerto:", config.port);
