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

        if (!contentType.startsWith("image/")) {
          return Response.json(
            {
              error: "The uploaded file is not an image"
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
              error: "No photograph was received"
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
                  role: "user",
                  parts: [
                    {
                      text: [
                        "Examine this photograph carefully.",
                        "Identify the Magic: The Gathering card shown.",
                        "Use the printed card title, artwork, rules text, card frame, set symbol and collector information as evidence.",
                        "Return the exact English card name.",
                        "Do not invent a card name.",
                        "If the photograph does not show a Magic: The Gathering card, or the card cannot be identified reliably, return an empty card_name and confidence 0."
                      ].join(" ")
                    },
                    {
                      inlineData: {
                        mimeType:
                          contentType
                            .split(";")[0]
                            .trim(),
                        data: base64Image
                      }
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.1,
                responseMimeType:
                  "application/json",
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

        const geminiData =
          await geminiResponse.json();

        if (!geminiResponse.ok) {
          console.error(
            "Gemini API error:",
            JSON.stringify(geminiData)
          );

          return Response.json(
            {
              error:
                "Gemini rejected the identification request",
              status:
                geminiResponse.status,
              details:
                geminiData?.error?.message ||
                "No error details were returned"
            },
            {
              status: 502
            }
          );
        }

        const responseText =
          geminiData
            ?.candidates?.[0]
            ?.content?.parts?.[0]
            ?.text;

        if (!responseText) {
          console.error(
            "Unexpected Gemini response:",
            JSON.stringify(geminiData)
          );

          return Response.json(
            {
              error:
                "Gemini returned no card identification"
            },
            {
              status: 502
            }
          );
        }

        let result;

        try {
          result =
            JSON.parse(responseText);
        } catch {
          const cleaned =
            responseText
              .replace(/```json/gi, "")
              .replace(/```/g, "")
              .trim();

          result =
            JSON.parse(cleaned);
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
              Number(result.confidence) || 0
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
          confidence
        });
      } catch (error) {
        console.error(
          "SpellCheck identification error:",
          error?.stack ||
            error?.message ||
            String(error)
        );

        return Response.json(
          {
            error:
              "Could not identify the card",
            details:
              error?.message ||
              "Unknown Worker error"
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
