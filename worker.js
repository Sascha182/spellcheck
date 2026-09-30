export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/identify") {
      try {
        const geminiApiKey =
          await env.GEMINI_API_KEY.get();

        if (!geminiApiKey) {
          return Response.json({
            success: false,
            stage: "secret",
            error: "Gemini key is unavailable"
          });
        }

        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": geminiApiKey
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text:
                        "Reply with exactly the words: Gemini connection works"
                    }
                  ]
                }
              ]
            })
          }
        );

        const geminiData =
          await geminiResponse.json();

        return Response.json({
          success: geminiResponse.ok,
          gemini_status: geminiResponse.status,
          gemini_response: geminiData
        });
      } catch (error) {
        return Response.json({
          success: false,
          stage: "worker",
          error:
            error?.message ||
            String(error)
        });
      }
    }

    return env.ASSETS.fetch(request);
  }
};
