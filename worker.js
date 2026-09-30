export default {
  async fetch(request, env) {

    try {

      const url = new URL(request.url);

      if (url.pathname === "/api/identify") {

        const key =
          await env.GEMINI_API_KEY.get();

        return Response.json({
          success: true,
          key_exists: !!key,
          method: request.method
        });

      }

      return env.ASSETS.fetch(request);

    } catch (error) {

      return new Response(
        JSON.stringify({
          crash: true,
          error:
            error?.message ||
            String(error),
          stack:
            error?.stack || null
        }),
        {
          headers: {
            "Content-Type":
              "application/json"
          }
        }
      );

    }

  }
}
