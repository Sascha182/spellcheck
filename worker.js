export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (
      request.method === "POST" &&
      url.pathname === "/api/identify"
    ) {

      try {

        const geminiApiKey =
          await env.GEMINI_API_KEY.get();

        return Response.json({
          success: true,
          key_exists: !!geminiApiKey,
          key_length: geminiApiKey.length
        });

      } catch (error) {

        return Response.json({
          success: false,
          error: String(error)
        });

      }

    }

    return env.ASSETS.fetch(request);

  }
}
