import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn(
    "\n⚠️  GEMINI_API_KEY .env file me nahi mili. .env.example ko .env me rename karke apni free key daalo (aistudio.google.com se).\n"
  );
}

async function callGeminiOnce(model, base64Image, prompt) {
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

async function callGeminiWithRetry(base64Image, prompt) {
  // Try the main model first, then fall back to a lighter model if busy
  const models = ["gemini-flash-latest", "gemini-2.5-flash-lite"];
  const maxRetriesPerModel = 3;

  for (const model of models) {
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      const response = await callGeminiOnce(model, base64Image, prompt);

      if (response.status === 503) {
        const isLastAttemptForModel = attempt === maxRetriesPerModel;
        if (!isLastAttemptForModel) {
          const waitMs = attempt * 3000;
          console.log(
            `${model} busy (503), retrying in ${waitMs}ms... (attempt ${attempt}/${maxRetriesPerModel})`
          );
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        } else {
          console.log(`${model} still busy after ${maxRetriesPerModel} attempts, trying next model...`);
          break; // move to next model in the outer loop
        }
      }

      // Success, or a non-503 error — return it as-is
      return response;
    }
  }

  // If we got here, every model failed with 503
  return callGeminiOnce(models[models.length - 1], base64Image, prompt);
}
app.post("/api/analyze", async (req, res) => {
  try {
    const { base64Image, prompt } = req.body;
    if (!base64Image || !prompt) {
      return res.status(400).json({ error: "base64Image and prompt are required" });
    }

    const response = await callGeminiWithRetry(base64Image, prompt);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 503) {
        return res.status(503).json({
          error: "Gemini abhi busy hai (free tier par aksar hota hai). Thodi der baad dobara try karo.",
        });
      }
      return res.status(response.status).json(data);
    }

    // Normalize into the same { content: [{ type: "text", text }] } shape the frontend expects
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    res.json({ content: [{ type: "text", text }] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Backend server chal raha hai: http://localhost:${PORT}`);
});