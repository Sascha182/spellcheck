export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (url.pathname === "/api/identify") {

      return Response.json({
        gemini_key_exists: !!env.GEMINI_API_KEY,
        key_length: env.GEMINI_API_KEY
          ? env.GEMINI_API_KEY.length
          : 0,
        method: request.method
      });

    }

    return env.ASSETS.fetch(request);
  }
};
