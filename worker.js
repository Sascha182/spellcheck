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
        if (!env.GEMINI_API_KEY) {
          return Response.json(
            {
              error: "GEMINI_API_KEY is not available to the Worker"
            },
            {
              status: 500
            }
          );
        }

        const contentType =
          request.headers.get("content-type") || "image/jpeg";

        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/heic",
          "image/heif"
        ];

        if (!allowedTypes.some(type => contentType.includes(type))) {
          return Response.json(
            {
              error: "Unsupported image type"
            },
            {
              status: 415
            }
          );
        }

        const imageBuffer = await request.arrayBuffer();

        if (imageBuffer.byteLength === 0) {
          return Response.json(
            {
              error: "No image was received"
            },
            {
              status: 400
            }
          );
        }

        const base64Image = arrayBufferToBase64(imageBuffer);

        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": env.GEMINI_API_KEY
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: [
                        "Examine this photograph.",
                        "Identify the Magic: The Gathering card shown.",
                        "Use the printed card name, artwork, rules text, set symbol and card frame as evidence.",
                        "Return the exact English card name.",
                        "If the photograph is not a Magic: The Gathering card, return an empty card_name and a confidence of 0."
                      ].join(" ")
                    },
                    {
                      inlineData: {
                        mimeType: contentType.split(";")[0],
                        data: base64Image
                      }
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json",
                responseSchema: {
                  type: "OBJECT",
                  properties: {
                    card_name: {
                      type: "STRING",
                      description:
                        "The exact English name of the Magic: The Gathering card"
                    },
                    confidence: {
                      type: "INTEGER",
                      description:
                        "Identification confidence from 0 to 100"
                    }
                  },
                  required: [
                    "card_name",
                    "confidence"
                  ]
                }
              }
            })
          }
        );

        const geminiData = await geminiResponse.json();

        if (!geminiResponse.ok) {
          console.error(
            "Gemini API error:",
            JSON.stringify(geminiData)
          );

          return Response.json(
            {
              error: "Gemini rejected the identification request",
              status: geminiResponse.status,
              details:
                geminiData?.error?.message ||
                "No error message was returned"
            },
            {
              status: 502
            }
          );
        }

        const responseText =
          geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
          console.error(
            "Unexpected Gemini response:",
            JSON.stringify(geminiData)
          );

          return Response.json(
            {
              error: "Gemini did not return an identification"
            },
            {
              status: 502
            }
          );
        }

        const result = JSON.parse(responseText);

        if (!result.card_name) {
          return Response.json(
            {
              error: "No Magic card could be identified"
            },
            {
              status: 422
            }
          );
        }

        return Response.json({
          card_name: result.card_name,
          confidence: Number(result.confidence) || 0
        });
      } catch (error) {
        console.error(
          "SpellCheck identification error:",
          error?.stack || error?.message || String(error)
        );

        return Response.json(
          {
            error: "Could not identify the card",
            details:
              error?.message || "Unknown Worker error"
          },
          {
            status: 500
          }
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
