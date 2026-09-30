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
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

async function askGemini(
  model,
  apiKey,
  mimeType,
  base64Image
) {
  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    model +
    ":generateContent";

  const response = await fetch(
    endpoint,
    {
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
                  "Use the printed title, artwork, rules text, card frame, set symbol and collector information as evidence.",
                  "Return the exact English card name.",
                  "Do not invent a card name.",
                  "If the image is not a Magic: The Gathering card, or cannot be identified reliably, return an empty card_name and confidence 0.",
                  "Return only valid JSON using this format:",
                  '{"card_name":"Lightning Greaves","confidence":98}'
                ].join(" ")
              },
              {
                inlineData: {
                  mimeType,
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
    }
  );

  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

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
            .trim();

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
         * Start with 3.7 because 3.8 returned
         * temporary high-demand errors.
         *
         * If one model returns 429, 500, 502,
         * 503 or 504, try the next model.
         */
        const models = [
          "gemini-3.7-flash",
          "gemini-3.8-flash",
          "gemini-3.6-flash"
        ];

        let lastFailure = null;

        for (const model of models) {
          const attempt =
            await askGemini(
              model,
              geminiApiKey,
              mimeType,
              base64Image
            );

          if (!attempt.ok) {
            lastFailure = {
              model,
              status: attempt.status,
              details:
                attempt.data?.error?.message ||
                "No error details returned"
            };

            const temporaryStatuses = [
              429,
              500,
              502,
              503,
              504
            ];

            if (
              temporaryStatuses.includes(
                attempt.status
              )
            ) {
              continue;
            }

            /*
             * If a specific model is unavailable
             * to this project, try the next model.
             */
            if (attempt.status === 404) {
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
            lastFailure = {
              model,
              status: 502,
              details:
                "The model returned no text"
            };

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
              lastFailure = {
                model,
                status: 502,
                details:
                  "The model returned invalid JSON"
              };

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
                confidence
              },
              {
                status: 422
              }
            );
          }

          return Response.json({
            card_name: cardName,
            confidence,
            model_used: model
          });
        }

        return Response.json(
          {
            error:
              "The identification service is temporarily unavailable",
            details:
              lastFailure
          },
          {
            status: 503
          }
        );
      }

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
