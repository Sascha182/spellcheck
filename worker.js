export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/identify") {

      const key = await env.GEMINI_API_KEY.get();

      return Response.json({
        gemini_key_exists: !!key,
        key_length: key ? key.length : 0
      });

    }

    return env.ASSETS.fetch(request);
  }
};
