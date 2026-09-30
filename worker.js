export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (url.pathname === "/api/identify") {

      try {

        const key =
          await env.GEMINI_API_KEY.get();

        const response =
          await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": key
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: "Say hello"
                      }
                    ]
                  }
                ]
              })
            }
          );

        const data =
          await response.json();

        return Response.json({
          status: response.status,
          data
        });

      } catch (error) {

        return Response.json({
          error: String(error)
        });

      }

    }

    return env.ASSETS.fetch(request);
  }
};
