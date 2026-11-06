import { NextResponse } from "next/server";
import { getExcelProducts, formatProductsForPrompt, ExcelProduct } from "@/lib/excel-reader";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Cache active working model so subsequent requests respond instantly without 400 retries
let cachedWorkingModel: string | null = null;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages = [] }: { messages: ChatMessage[] } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in .env.local" },
        { status: 500 }
      );
    }
    const requestedModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-live-preview";

    // 1. Fetch live product data from ecomerce.xlsx
    const products: ExcelProduct[] = getExcelProducts();
    const productCatalogText = formatProductsForPrompt(products);

    const systemPrompt = `You are "Shopco AI", the expert, friendly personal shopping assistant for the Shopco e-commerce store.
You have direct access to our live store inventory and product catalog from our warehouse spreadsheet:

--- LIVE PRODUCT CATALOG ---
${productCatalogText}
----------------------------

Guidelines:
1. Always be polite, modern, concise, and helpful.
2. Recommend items according to the shopper's style, occasion, category, budget, and preferences.
3. Be strictly accurate with prices and stock availability:
   - Check the Stock status: If an item is "Out of stock" (e.g. vertical striped), let the customer know politely and suggest similar in-stock items.
   - Mention the exact price ($) as listed.
4. You can assist with sizing advice, styling tips, pairing clothes (e.g. matching jeans with polos or t-shirts), and store policies.
5. Keep your responses engaging, clear, and easy to read using markdown formatting where helpful.`;

    // Format chat history for Gemini API
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    for (const msg of messages) {
      if (msg.role === "user") {
        contents.push({
          role: "user",
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === "assistant") {
        contents.push({
          role: "model",
          parts: [{ text: msg.content }],
        });
      }
    }

    if (contents.length === 0) {
      return NextResponse.json({ error: "No user message provided" }, { status: 400 });
    }

    // Function to call Gemini API with given model
    const callGemini = async (modelName: string) => {
      const cleanModel = modelName.replace(/^models\//, "");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        }),
      });

      return res;
    }

    // Model priority order
    const candidateModels = cachedWorkingModel
      ? [cachedWorkingModel]
      : [
          // If the requested model is the Live WebSocket model, note that generateContent requires standard Flash
          requestedModel === "gemini-3.1-flash-live-preview" ? "gemini-2.5-flash" : requestedModel,
          "gemini-2.5-flash",
          "gemini-flash-latest",
          "gemini-3-flash-preview",
        ];

    let response: Response | null = null;
    let activeModelUsed = "";
    let lastError = "";

    for (const model of candidateModels) {
      try {
        const res = await callGemini(model);
        if (res.ok) {
          response = res;
          activeModelUsed = model;
          cachedWorkingModel = model;
          break;
        } else {
          lastError = await res.text();
          console.warn(`[Gemini API] Model ${model} returned ${res.status}: ${lastError}`);
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    if (!response || !response.ok) {
      return NextResponse.json(
        { error: `Gemini API error: ${lastError}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const replyText =
      candidate?.content?.parts?.[0]?.text ||
      "I'm sorry, I couldn't generate a response. Please try again.";

    // Find any mentioned products to return as suggested cards
    const mentionedProducts = products.filter((p) =>
      replyText.toLowerCase().includes(p.name.toLowerCase())
    );

    return NextResponse.json({
      reply: replyText,
      modelUsed: activeModelUsed,
      catalogSize: products.length,
      suggestedProducts: mentionedProducts,
    });
  } catch (error: any) {
    console.error("[ChatAPI] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const products = getExcelProducts();
  return NextResponse.json({
    status: "ok",
    productCount: products.length,
    products,
  });
}
