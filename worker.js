export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      request.method === "POST" &&
      url.pathname === "/api/identify"
    ) {
      return Response.json({
        card_name: "Sol Ring",
        confidence: 99
      });
    }

    return env.ASSETS.fetch(request);
  }
};
