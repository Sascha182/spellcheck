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

function cleanJson(text) {
  return String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

async function identifyWithModel(
  model,
  apiKey,
  mimeType,
  base64Image
) {
  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    model +
    ":generateContent";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "Examine this photograph carefully.",
                "Identify the Magic: The Gathering card shown.",
                "Use the printed card title, artwork, rules text, card frame, set symbol and collector information as evidence.",
                "Return the exact English card name.",
                "Do not invent a card name.",
                "If the card is printed in another language, return its official English name.",
                "If the photograph does not show a Magic: The Gathering card, or the card cannot be identified reliably, return an empty card_name and confidence 0.",
                "Return only valid JSON.",
                "Use exactly this structure:",
                "{\"card_name\":\"Lightning Greaves\",\"confidence\":98}"
              ].join(" ")
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    })
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = {
      error: {
        message:
          "Gemini returned a response that was not valid JSON."
      }
    };
  }

  return {
    model: model,
    ok: response.ok,
    status: response.status,
    data: data
  };
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      /*
       * Browser health check.
       *
       * Open /api/identify directly to see whether
       * the Worker and secret binding are available.
       */
      if (
        request.method === "GET" &&
        url.pathname === "/api/identify"
      ) {
        let keyExists = false;

        try {
          const key =
            await env.GEMINI_API_KEY.get();

          keyExists = Boolean(key);
        } catch {
          keyExists = false;
        }

        return Response.json({
          success: true,
          service: "SpellCheck card identification",
          secret_connected: keyExists,
          expected_method: "POST"
        });
      }

      /*
       * Photograph identification endpoint.
       */
      if (
        request.method === "POST" &&
        url.pathname === "/api/identify"
      ) {
        const geminiApiKey =
          await env.GEMINI_API_KEY.get();

        if (!geminiApiKey) {
          return Response.json(
            {
              error:
                "Gemini API key is unavailable"
            },
            {
              status: 500
            }
          );
        }

        const contentType =
          request.headers.get("content-type") ||
          "image/jpeg";

        const mimeType =
          contentType
            .split(";")[0]
            .trim()
            .toLowerCase();

        if (!mimeType.startsWith("image/")) {
          return Response.json(
            {
              error:
                "The uploaded file is not an image"
            },
            {
              status: 415
            }
          );
        }

        const imageBuffer =
          await request.arrayBuffer();

        if (imageBuffer.byteLength === 0) {
          return Response.json(
            {
              error:
                "No photograph was received"
            },
            {
              status: 400
            }
          );
        }

        /*
         * Keep the complete Gemini request below
         * the inline-image request limit.
         */
        if (
          imageBuffer.byteLength >
          15 * 1024 * 1024
        ) {
          return Response.json(
            {
              error:
                "The photograph is too large"
            },
            {
              status: 413
            }
          );
        }

        const base64Image =
          arrayBufferToBase64(imageBuffer);

        /*
         * Gemini 3.8 previously returned a temporary
         * high-demand error, so start with 3.7.
         */
        const models = [
          "gemini-3.7-flash",
          "gemini-3.6-flash",
          "gemini-3.8-flash"
        ];

        const retryableStatuses = [
          404,
          429,
          500,
          502,
          503,
          504
        ];

        const failures = [];

        for (const model of models) {
          const attempt =
            await identifyWithModel(
              model,
              geminiApiKey,
              mimeType,
              base64Image
            );

          if (!attempt.ok) {
            failures.push({
              model: model,
              status: attempt.status,
              message:
                attempt.data?.error?.message ||
                "No error details were returned"
            });

            if (
              retryableStatuses.includes(
                attempt.status
              )
            ) {
              continue;
            }

            break;
          }

          const responseText =
            attempt.data
              ?.candidates?.[0]
              ?.content?.parts?.[0]
              ?.text;

          if (!responseText) {
            failures.push({
              model: model,
              status: 502,
              message:
                "Gemini returned no identification text"
            });

            continue;
          }

          let result;

          try {
            result =
              JSON.parse(responseText);
          } catch {
            try {
              result =
                JSON.parse(
                  cleanJson(responseText)
                );
            } catch {
              failures.push({
                model: model,
                status: 502,
                message:
                  "Gemini returned invalid identification JSON"
              });

              continue;
            }
          }

          const cardName =
            String(
              result.card_name || ""
            ).trim();

          const confidence =
            Math.max(
              0,
              Math.min(
                100,
                Number(
                  result.confidence
                ) || 0
              )
            );

          if (!cardName) {
            return Response.json(
              {
                error:
                  "No Magic card could be identified",
                confidence: confidence
              },
              {
                status: 422
              }
            );
          }

          /*
           * These are the exact fields expected
           * by the current app.js file.
           */
          return Response.json({
            card_name: cardName,
            confidence: confidence,
            model_used: model
          });
        }

        return Response.json(
          {
            error:
              "The card identification service is temporarily unavailable",
            attempts: failures
          },
          {
            status: 503
          }
        );
      }

      /*
       * Serve index.html, styles.css, app.js
       * and the rest of the static website.
       */
      return env.ASSETS.fetch(request);
    } catch (error) {
      return Response.json(
        {
          error:
            "SpellCheck could not process the photograph",
          details:
            error?.message ||
            String(error)
        },
        {
          status: 500
        }
      );
    }
  }
};
