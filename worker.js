export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/identify") {
        const imageBuffer = await request.arrayBuffer();

        return Response.json({
          success: true,
          size: imageBuffer.byteLength,
          method: request.method,
          contentType: request.headers.get("content-type")
        });
      }

      return env.ASSETS.fetch(request);

    } catch (error) {
      return Response.json({
        success: false,
        error: String(error),
        stack: error?.stack || null
      });
    }
  }
}
