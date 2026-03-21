Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }
    return new Response("Not Found", { status: 404 });
  },
});
console.log("Server is running on http://localhost:3000");
