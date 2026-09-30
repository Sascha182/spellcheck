export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    // API endpoint
    if (
      request.method === "POST" &&
      url.pathname === "/api/identify"
    ) {

      return Response.json({
        card_name: "Lightning Greaves",
        confidence: 98
      });

    }

    // Static website
    return env.ASSETS.fetch(request);
  }
};
