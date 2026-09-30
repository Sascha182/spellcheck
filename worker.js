export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (
      request.method === "POST" &&
      url.pathname === "/api/identify"
    ) {

      try {

        const imageBuffer =
          await request.arrayBuffer();

        return Response.json({
          success: true,
          image_size: imageBuffer.byteLength,
          content_type:
            request.headers.get("content-type")
        });

      } catch (error) {

        return Response.json({
          success: false,
          error:
            error?.message ||
            String(error)
        });

      }

    }

    return env.ASSETS.fetch(request);

  }
}
