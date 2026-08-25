export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { base64Image, prompt } = req.body;
  if (!base64Image || !prompt) {
    return res.status(400).json({ error: "base64Image and prompt are required" });
  }

  const API_KEY = process.env.GEMINI_API_KEY;

  async function callGeminiOnce(model) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: "image/jpeg", data: base64Image } },
              { text: prompt },
            ],
          },
        ],
      }),
    });
  }

  async function callGeminiWithRetry() {
    const models = ["gemini-flash-latest", "gemini-2.5-flash-lite"];
    const maxRetriesPerModel = 3;

    for (const model of models) {
      for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
        const response = await callGeminiOnce(model);

        if (response.status === 503) {
          const isLastAttemptForModel = attempt === maxRetriesPerModel;
          if (!isLastAttemptForModel) {
            const waitMs = attempt * 3000;
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          } else {
            break;
          }
        }
        return response;
      }
    }
    return callGeminiOnce(models[models.length - 1]);
  }

  try {
    const response = await callGeminiWithRetry();
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 503) {
        return res.status(503).json({
          error: "Gemini abhi busy hai. Thodi der baad dobara try karo.",
        });
      }
      return res.status(response.status).json(data);
    }

    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    res.json({ content: [{ type: "text", text }] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}