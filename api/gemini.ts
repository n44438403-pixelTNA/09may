export const config = {
  runtime: 'nodejs',
};

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1/models";

export default async function handler(req: Request) {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
    }

    const { model, contents, generationConfig, safetySettings, key, tools, toolConfig } = body;

    let modelToUse = model || "gemini-1.5-flash";

    // 1. Determine API Key
    let apiKey = key;
    if (!apiKey) {
        // Fallback to ENV
        const keysRaw = process.env.GEMINI_API_KEYS;
        if (keysRaw) {
            const keys = keysRaw.split(",").map(k => k.trim()).filter(Boolean);
            if (keys.length > 0) {
                console.log(`Loaded ${keys.length} Gemini API Keys from ENV.`);
                apiKey = keys[Math.floor(Math.random() * keys.length)];
            }
        }
    }

    if (!apiKey) {
        return new Response(JSON.stringify({ error: "Server Configuration Error: No valid Gemini keys found (ENV or Body)." }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    // 2. Call Gemini
    const endpoint = `${GEMINI_BASE_URL}/${modelToUse}:generateContent?key=${apiKey}`;

    const payload: any = {
      contents,
      generationConfig,
      safetySettings,
      tools,
      toolConfig
    };

    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!geminiRes.ok) {
        const errorText = await geminiRes.text();
        return new Response(JSON.stringify({ error: "Gemini API Error", detail: errorText }), {
            status: geminiRes.status,
            headers: { "Content-Type": "application/json" }
        });
    }

    const data = await geminiRes.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Server Internal Error", detail: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
    });
  }
}
