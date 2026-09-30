export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (
      request.method === "POST" &&
      url.pathname === "/api/identify"
    ) {

      return Response.json({
        card_name: "Lightning Greaves",
        confidence: 99,
        debug: "worker still working"
      });

    }

    return env.ASSETS.fetch(request);

  }
}
