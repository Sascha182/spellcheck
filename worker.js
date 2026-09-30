function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      request.method === "POST" &&
      url.pathname === "/api/identify"
    ) {
      try {
        /*
         * GEMINI_API_KEY is a Cloudflare Secrets Store binding.
         * Secrets Store bindings must be retrieved with .get().
         */
        const geminiApiKey =
          await env.GEMINI_API_KEY.get();

        if (!geminiApiKey) {
          return Response.json(
            {
              error: "Gemini API key is unavailable"
            },
            {
              status: 500
            }
          );
        }

        const contentType =
          request.headers.get("content-type") ||
          "image/jpeg";

        const imageBuffer =
          await request.arrayBuffer();

        if (imageBuffer.byteLength === 0) {
          return Response.json(
            {
              error: "No photograph was received"
            },
            {
              status: 400
            }
          );
        }

        /*
         * Prevent an unexpectedly large upload.
         * 15 MB is sufficient for an ordinary phone photograph.
         */
        if (imageBuffer.byteLength > 15 * 1024 * 1024) {
          return Response.json(
            {
              error: "The photograph is too large"
            },
            {
              status: 413
            }
          );
        }

        const base64Image =
          arrayBufferToBase64(imageBuffer);

        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiApiKey
            },
            body: JSON.stringify({
              contents
