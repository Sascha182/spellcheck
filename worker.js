export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (url.pathname === "/api/identify") {

      try {

        const key =
          await env.GEMINI_API_KEY.get();

        return Response.json({
          success: true,
          key_exists: !!key,
          method: request.method
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
};
