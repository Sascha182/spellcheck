export default {
  async fetch(request, env) {

    const url = new URL(request.url);

  if (
  request.method === "POST" &&
  url.pathname === "/api/identify"
) {

  return Response.json({
    card_name: "Sol Ring",
    confidence: 99
  });

}

        const imageBuffer = await request.arrayBuffer();

        const base64Image =
          btoa(
            String.fromCharCode(
              ...new Uint8Array(imageBuffer)
            )
          );

        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
            env.GEMINI_API_KEY,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `
Look at this Magic: The Gathering card.

Identify the card.

Return ONLY valid JSON.

Example:

{
  "card_name":"Lightning Greaves",
  "confidence":98
}
`
                    },
                    {
                      inline_data: {
                        mime_type:
                          request.headers.get("content-type") ||
                          "image/jpeg",
                        data: base64Image
                      }
                    }
                  ]
                }
              ]
            })
          }
        );

        const gemini = await geminiResponse.json();

        const text =
          gemini?.candidates?.[0]?.content?.parts?.[0]?.text;

       const cleaned = text
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

const result = JSON.parse(cleaned);

        return Response.json(result);

      } catch (error) {

        return Response.json(
          {
            error: "Could not identify card"
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
