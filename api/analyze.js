// export default async function handler(req, res) {
//   // =========================================================
//   // METHOD CHECK
//   // =========================================================

//   if (req.method !== "POST") {
//     return res.status(405).json({
//       error: "Method not allowed",
//     });
//   }

//   // =========================================================
//   // REQUEST DATA
//   // =========================================================

//   const { base64Image, prompt } = req.body || {};

//   if (!base64Image || !prompt) {
//     return res.status(400).json({
//       error: "base64Image and prompt are required",
//     });
//   }

//   // =========================================================
//   // API KEYS
//   // =========================================================

//   const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
//   const GROQ_API_KEY = process.env.GROQ_API_KEY;
//   const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
//   const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
//   const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

//   // =========================================================
//   // IMAGE PROCESSING
//   // =========================================================

//   // If frontend sends:
//   // data:image/jpeg;base64,XXXXX
//   //
//   // extract only XXXXX

//   const cleanBase64 = base64Image.includes(",")
//     ? base64Image.split(",")[1]
//     : base64Image;

//   const mimeType = "image/jpeg";

//   const imageDataUrl = `data:${mimeType};base64,${cleanBase64}`;

//   // =========================================================
//   // TIMEOUT FUNCTION
//   // =========================================================

//   async function fetchWithTimeout(url, options, timeout = 10000) {
//     const controller = new AbortController();

//     const timer = setTimeout(() => {
//       controller.abort();
//     }, timeout);

//     try {
//       return await fetch(url, {
//         ...options,
//         signal: controller.signal,
//       });
//     } finally {
//       clearTimeout(timer);
//     }
//   }

//   // =========================================================
//   // RESPONSE TEXT EXTRACTOR
//   // =========================================================

//   function extractText(data) {
//     // Gemini
//     if (data?.candidates?.[0]?.content?.parts) {
//       return data.candidates[0].content.parts
//         .map((part) => part.text || "")
//         .join("");
//     }

//     // OpenAI-compatible APIs
//     // Groq
//     // Mistral
//     // OpenRouter
//     if (data?.choices?.[0]?.message?.content) {
//       return data.choices[0].message.content;
//     }

//     // Anthropic
//     if (Array.isArray(data?.content)) {
//       return data.content
//         .map((item) => item.text || "")
//         .join("");
//     }

//     return "";
//   }

//   // =========================================================
//   // PARSE PROVIDER RESPONSE
//   // =========================================================

//   async function parseResponse(response, providerName) {
//     let data;

//     try {
//       data = await response.json();
//     } catch {
//       throw new Error(`${providerName} returned an invalid response`);
//     }

//     if (!response.ok) {
//       const message =
//         data?.error?.message ||
//         data?.error?.status ||
//         data?.message ||
//         "Unknown API error";

//       throw new Error(
//         `${providerName} (${response.status}): ${message}`
//       );
//     }

//     const text = extractText(data);

//     if (!text) {
//       throw new Error(`${providerName} returned an empty response`);
//     }

//     return text;
//   }

//   // =========================================================
//   // 1. GROQ
//   // =========================================================

//   async function callGroq() {
//     if (!GROQ_API_KEY) {
//       throw new Error("GROQ_API_KEY is not configured");
//     }

//     const response = await fetchWithTimeout(
//       "https://api.groq.com/openai/v1/chat/completions",
//       {
//         method: "POST",

//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${GROQ_API_KEY}`,
//         },

//         body: JSON.stringify({
//           model: "qwen/qwen3.6-27b",

//           messages: [
//             {
//               role: "user",

//               content: [
//                 {
//                   type: "text",
//                   text: prompt,
//                 },

//                 {
//                   type: "image_url",

//                   image_url: {
//                     url: imageDataUrl,
//                   },
//                 },
//               ],
//             },
//           ],

//           temperature: 0.2,

//           max_completion_tokens: 1200,
//         }),
//       },
//       8000
//     );

//     return await parseResponse(response, "Groq");
//   }

//   // =========================================================
//   // 2. GEMINI
//   // =========================================================

//   async function callGemini() {
//     if (!GEMINI_API_KEY) {
//       throw new Error("GEMINI_API_KEY is not configured");
//     }

//     // const models = [
//     //   "gemini-2.5-flash-lite",
//     //   "gemini-2.5-flash",
//     // ];
//     const models = [
//   "gemini-3.5-flash-lite",
//   "gemini-3.5-flash",
// ];

//     let lastError = null;

//     for (const model of models) {
//       try {
//         const url =
//           `https://generativelanguage.googleapis.com/v1beta/models/` +
//           `${model}:generateContent?key=${GEMINI_API_KEY}`;

//         const response = await fetchWithTimeout(
//           url,
//           {
//             method: "POST",

//             headers: {
//               "Content-Type": "application/json",
//             },

//             body: JSON.stringify({
//               contents: [
//                 {
//                   parts: [
//                     {
//                       inline_data: {
//                         mime_type: mimeType,
//                         data: cleanBase64,
//                       },
//                     },

//                     {
//                       text: prompt,
//                     },
//                   ],
//                 },
//               ],

//               generationConfig: {
//                 temperature: 0.2,
//               },
//             }),
//           },
//           10000
//         );

//         if (response.ok) {
//           return await parseResponse(response, "Gemini");
//         }

//         const errorData = await response.json().catch(() => null);

//         lastError = new Error(
//           `Gemini (${response.status}): ${
//             errorData?.error?.message || "Request failed"
//           }`
//         );

//         // Try next Gemini model only for temporary errors
//         if (![429, 500, 502, 503, 504].includes(response.status)) {
//           break;
//         }
//       } catch (error) {
//         lastError = error;
//       }
//     }

//     throw lastError || new Error("Gemini failed");
//   }

//   // =========================================================
//   // 3. MISTRAL
//   // =========================================================

//   async function callMistral() {
//     if (!MISTRAL_API_KEY) {
//       throw new Error("MISTRAL_API_KEY is not configured");
//     }

//     const response = await fetchWithTimeout(
//       "https://api.mistral.ai/v1/chat/completions",
//       {
//         method: "POST",

//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${MISTRAL_API_KEY}`,
//         },

//         body: JSON.stringify({
//           model: "pixtral-12b-2409",

//           messages: [
//             {
//               role: "user",

//               content: [
//                 {
//                   type: "text",
//                   text: prompt,
//                 },

//                 {
//                   type: "image_url",

//                   image_url: {
//                     url: imageDataUrl,
//                   },
//                 },
//               ],
//             },
//           ],

//           temperature: 0.2,

//           max_tokens: 1200,
//         }),
//       },
//       10000
//     );

//     return await parseResponse(response, "Mistral");
//   }

//   // =========================================================
//   // 4. OPENROUTER
//   // =========================================================

//   async function callOpenRouter() {
//     if (!OPENROUTER_API_KEY) {
//       throw new Error("OPENROUTER_API_KEY is not configured");
//     }

//     const response = await fetchWithTimeout(
//       "https://openrouter.ai/api/v1/chat/completions",
//       {
//         method: "POST",

//         headers: {
//           "Content-Type": "application/json",

//           Authorization: `Bearer ${OPENROUTER_API_KEY}`,

//           "HTTP-Referer":
//             process.env.APP_URL ||
//             "https://analyzeimage.vercel.app",

//           "X-Title": "Vision Lab",
//         },

//         body: JSON.stringify({
//           model:
//             process.env.OPENROUTER_MODEL ||
//             "google/gemini-2.5-flash",

//           messages: [
//             {
//               role: "user",

//               content: [
//                 {
//                   type: "text",
//                   text: prompt,
//                 },

//                 {
//                   type: "image_url",

//                   image_url: {
//                     url: imageDataUrl,
//                   },
//                 },
//               ],
//             },
//           ],

//           temperature: 0.2,

//           max_tokens: 1200,
//         }),
//       },
//       10000
//     );

//     return await parseResponse(response, "OpenRouter");
//   }

//   // =========================================================
//   // 5. ANTHROPIC CLAUDE
//   // =========================================================

//   async function callAnthropic() {
//     if (!ANTHROPIC_API_KEY) {
//       throw new Error("ANTHROPIC_API_KEY is not configured");
//     }

//     const response = await fetchWithTimeout(
//       "https://api.anthropic.com/v1/messages",
//       {
//         method: "POST",

//         headers: {
//           "Content-Type": "application/json",

//           "x-api-key": ANTHROPIC_API_KEY,

//           "anthropic-version": "2023-06-01",
//         },

//         body: JSON.stringify({
//           model:
//             process.env.ANTHROPIC_MODEL ||
//             "claude-sonnet-4-6",

//           max_tokens: 1200,

//           temperature: 0.2,

//           messages: [
//             {
//               role: "user",

//               content: [
//                 {
//                   type: "image",

//                   source: {
//                     type: "base64",

//                     media_type: mimeType,

//                     data: cleanBase64,
//                   },
//                 },

//                 {
//                   type: "text",
//                   text: prompt,
//                 },
//               ],
//             },
//           ],
//         }),
//       },
//       15000
//     );

//     return await parseResponse(response, "Anthropic");
//   }

//   // =========================================================
//   // FALLBACK SYSTEM
//   // =========================================================

//   const providers = [
//     {
//       name: "Groq",
//       call: callGroq,
//     },

//     {
//       name: "Gemini",
//       call: callGemini,
//     },

//     {
//       name: "Mistral",
//       call: callMistral,
//     },

//     {
//       name: "OpenRouter",
//       call: callOpenRouter,
//     },

//     {
//       name: "Anthropic",
//       call: callAnthropic,
//     },
//   ];

//   const errors = [];

//   // =========================================================
//   // TRY EVERY PROVIDER
//   // =========================================================

//   for (const provider of providers) {
//     try {
//       console.log(
//         `[Vision Lab] Trying ${provider.name}...`
//       );

//       const text = await provider.call();

//       console.log(
//         `[Vision Lab] ${provider.name} succeeded`
//       );

//       return res.status(200).json({
//         provider: provider.name,

//         content: [
//           {
//             type: "text",
//             text: text,
//           },
//         ],
//       });
//     } catch (error) {
//       const errorMessage =
//         error?.name === "AbortError"
//           ? `${provider.name} timeout`
//           : error?.message ||
//             `${provider.name} failed`;

//       console.error(
//         `[Vision Lab] ${errorMessage}`
//       );

//       errors.push({
//         provider: provider.name,
//         error: errorMessage,
//       });

//       // Continue to next provider
//     }
//   }

//   // =========================================================
//   // ALL PROVIDERS FAILED
//   // =========================================================

//   return res.status(503).json({
//     error:
//       "All AI providers are currently unavailable. Please try again later.",

//     providers: errors,
//   });
// }




export default async function handler(req, res) {
  // =========================================================
  // METHOD CHECK
  // =========================================================

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  // =========================================================
  // REQUEST DATA
  // =========================================================

  const { base64Image, prompt } = req.body || {};

  if (!base64Image || !prompt) {
    return res.status(400).json({
      error: "base64Image and prompt are required",
    });
  }

  // =========================================================
  // API KEYS
  // =========================================================

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  // =========================================================
  // IMAGE PROCESSING
  // =========================================================

  const cleanBase64 = base64Image.includes(",")
    ? base64Image.split(",")[1]
    : base64Image;

  const mimeType = "image/jpeg";

  const imageDataUrl = `data:${mimeType};base64,${cleanBase64}`;

  // =========================================================
  // TIMEOUT
  // =========================================================

  async function fetchWithTimeout(url, options, timeout = 10000) {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  // =========================================================
  // EXTRACT TEXT FROM PROVIDER RESPONSE
  // =========================================================

  function extractText(data) {
    // Gemini
    if (data?.candidates?.[0]?.content?.parts) {
      return data.candidates[0].content.parts
        .map((part) => part.text || "")
        .join("");
    }

    // Groq / Mistral / OpenRouter
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    // Anthropic
    if (Array.isArray(data?.content)) {
      return data.content
        .map((item) => item.text || "")
        .join("");
    }

    return "";
  }

  // =========================================================
  // PARSE PROVIDER RESPONSE
  // =========================================================

  async function parseResponse(response, providerName) {
    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        `${providerName} returned an invalid response`
      );
    }

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.error?.status ||
        data?.message ||
        "Unknown API error";

      throw new Error(
        `${providerName} (${response.status}): ${message}`
      );
    }

    const text = extractText(data);

    if (!text) {
      throw new Error(
        `${providerName} returned an empty response`
      );
    }

    return text;
  }

  // =========================================================
  // CLEAN JSON RESPONSE
  // =========================================================

  function extractFirstJsonObject(text) {
    if (!text || typeof text !== "string") {
      throw new Error("Empty AI response");
    }

    let cleaned = text.trim();

    // Remove <think>...</think>
    cleaned = cleaned.replace(
      /<think>[\s\S]*?<\/think>/gi,
      ""
    );

    // Remove markdown code fences
    cleaned = cleaned.replace(/```json/gi, "");
    cleaned = cleaned.replace(/```/g, "");

    cleaned = cleaned.trim();

    // Find first JSON object
    const firstBrace = cleaned.indexOf("{");

    if (firstBrace === -1) {
      throw new Error(
        "AI response does not contain JSON"
      );
    }

    let depth = 0;
    let inString = false;
    let escaped = false;
    let endIndex = -1;

    for (let i = firstBrace; i < cleaned.length; i++) {
      const char = cleaned[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === "{") {
        depth++;
      }

      if (char === "}") {
        depth--;

        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (endIndex === -1) {
      throw new Error(
        "AI returned incomplete JSON"
      );
    }

    const jsonText = cleaned.slice(
      firstBrace,
      endIndex + 1
    );

    // Validate JSON
    try {
      JSON.parse(jsonText);
    } catch (error) {
      console.error(
        "[Vision Lab] Invalid JSON:",
        jsonText
      );

      throw new Error(
        "Could not parse model response"
      );
    }

    return jsonText;
  }

  // =========================================================
  // 1. MISTRAL
  // =========================================================

  async function callMistral() {
    if (!MISTRAL_API_KEY) {
      throw new Error(
        "MISTRAL_API_KEY is not configured"
      );
    }

    const response = await fetchWithTimeout(
      "https://api.mistral.ai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
        },

        body: JSON.stringify({
          model: "pixtral-12b-2409",

          messages: [
            {
              role: "user",

              content: [
                {
                  type: "text",
                  text: prompt,
                },

                {
                  type: "image_url",

                  image_url: {
                    url: imageDataUrl,
                  },
                },
              ],
            },
          ],

          temperature: 0.2,
          max_tokens: 1200,
        }),
      },
      10000
    );

    const text = await parseResponse(
      response,
      "Mistral"
    );

    return extractFirstJsonObject(text);
  }

  // =========================================================
  // 2. GEMINI
  // =========================================================

  async function callGemini() {
    if (!GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is not configured"
      );
    }

    const models = [
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash",
    ];

    let lastError = null;

    for (const model of models) {
      try {
        const url =
          `https://generativelanguage.googleapis.com/v1beta/models/` +
          `${model}:generateContent?key=${GEMINI_API_KEY}`;

        const response = await fetchWithTimeout(
          url,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: cleanBase64,
                      },
                    },

                    {
                      text: prompt,
                    },
                  ],
                },
              ],

              generationConfig: {
                temperature: 0.2,
              },
            }),
          },
          10000
        );

        if (response.ok) {
          const text = await parseResponse(
            response,
            "Gemini"
          );

          return extractFirstJsonObject(text);
        }

        const errorData = await response
          .json()
          .catch(() => null);

        lastError = new Error(
          `Gemini (${response.status}): ${
            errorData?.error?.message ||
            "Request failed"
          }`
        );

        if (
          ![429, 500, 502, 503, 504].includes(
            response.status
          )
        ) {
          break;
        }
      } catch (error) {
        lastError = error;
      }
    }

    throw (
      lastError ||
      new Error("Gemini failed")
    );
  }

  // =========================================================
  // 3. OPENROUTER
  // =========================================================

  async function callOpenRouter() {
    if (!OPENROUTER_API_KEY) {
      throw new Error(
        "OPENROUTER_API_KEY is not configured"
      );
    }

    const response = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${OPENROUTER_API_KEY}`,

          "HTTP-Referer":
            process.env.APP_URL ||
            "https://analyzeimage.vercel.app",

          "X-Title": "Vision Lab",
        },

        body: JSON.stringify({
          model:
            process.env.OPENROUTER_MODEL ||
            "google/gemini-2.5-flash",

          messages: [
            {
              role: "user",

              content: [
                {
                  type: "text",
                  text: prompt,
                },

                {
                  type: "image_url",

                  image_url: {
                    url: imageDataUrl,
                  },
                },
              ],
            },
          ],

          temperature: 0.2,
          max_tokens: 1200,
        }),
      },
      10000
    );

    const text = await parseResponse(
      response,
      "OpenRouter"
    );

    return extractFirstJsonObject(text);
  }

  // =========================================================
  // 4. GROQ
  // =========================================================

  async function callGroq() {
    if (!GROQ_API_KEY) {
      throw new Error(
        "GROQ_API_KEY is not configured"
      );
    }

    const response = await fetchWithTimeout(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${GROQ_API_KEY}`,
        },

        body: JSON.stringify({
          model: "qwen/qwen3.6-27b",

          messages: [
            {
              role: "system",

              content:
                "You are an image analysis AI. " +
                "Return exactly ONE valid JSON object. " +
                "Do not use markdown. " +
                "Do not use code fences. " +
                "Do not include <think>. " +
                "Do not include reasoning. " +
                "Do not include any text before or after JSON.",
            },

            {
              role: "user",

              content: [
                {
                  type: "text",

                  text:
                    `${prompt}\n\n` +
                    "Return ONLY one valid JSON object. " +
                    "Use the exact structure requested by the prompt.",
                },

                {
                  type: "image_url",

                  image_url: {
                    url: imageDataUrl,
                  },
                },
              ],
            },
          ],

          temperature: 0.1,
          max_completion_tokens: 2000,
        }),
      },
      15000
    );

    const text = await parseResponse(
      response,
      "Groq"
    );

    console.log(
      "[Vision Lab] Raw Groq response received"
    );

    return extractFirstJsonObject(text);
  }

  // =========================================================
  // 5. ANTHROPIC
  // =========================================================

  async function callAnthropic() {
    if (!ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not configured"
      );
    }

    const response = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          "x-api-key": ANTHROPIC_API_KEY,

          "anthropic-version": "2023-06-01",
        },

        body: JSON.stringify({
          model:
            process.env.ANTHROPIC_MODEL ||
            "claude-sonnet-4-6",

          max_tokens: 1200,
          temperature: 0.2,

          messages: [
            {
              role: "user",

              content: [
                {
                  type: "image",

                  source: {
                    type: "base64",
                    media_type: mimeType,
                    data: cleanBase64,
                  },
                },

                {
                  type: "text",
                  text: prompt,
                },
              ],
            },
          ],
        }),
      },
      15000
    );

    const text = await parseResponse(
      response,
      "Anthropic"
    );

    return extractFirstJsonObject(text);
  }

  // =========================================================
  // FALLBACK ORDER
  // =========================================================

  const providers = [
      
          {
            name: "OpenRouter",
            call: callOpenRouter,
          },
      {
        name: "Gemini",
        call: callGemini,
      },
    {
      name: "Mistral",
      call: callMistral,
    },


    {
      name: "Groq",
      call: callGroq,
    },

    {
      name: "Anthropic",
      call: callAnthropic,
    },
  ];

  // =========================================================
  // TRY PROVIDERS
  // =========================================================

  const errors = [];

  for (const provider of providers) {
    try {
      console.log(
        `[Vision Lab] Trying ${provider.name}...`
      );

      const text = await provider.call();

      console.log(
        `[Vision Lab] ${provider.name} succeeded`
      );

      return res.status(200).json({
        provider: provider.name,

        content: [
          {
            type: "text",
            text: text,
          },
        ],
      });
    } catch (error) {
      const errorMessage =
        error?.name === "AbortError"
          ? `${provider.name} timeout`
          : error?.message ||
            `${provider.name} failed`;

      console.error(
        `[Vision Lab] ${errorMessage}`
      );

      errors.push({
        provider: provider.name,
        error: errorMessage,
      });
    }
  }

  // =========================================================
  // ALL PROVIDERS FAILED
  // =========================================================

  return res.status(503).json({
    error:
      "All AI providers are currently unavailable. Please try again later.",

    providers: errors,
  });
}