export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (
      request.method === "POST" &&
      url.pathname === "/api/identify"
    ) {

      try {

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

        const result = JSON.parse(text);

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
