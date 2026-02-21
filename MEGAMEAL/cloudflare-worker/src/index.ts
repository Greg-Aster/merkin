var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
function handleOptions(request) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Provider"
  };
  return new Response(null, { headers });
}
__name(handleOptions, "handleOptions");
function jsonResponse(data, options) {
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  };
  return new Response(JSON.stringify(data), { ...defaultOptions, ...options });
}
__name(jsonResponse, "jsonResponse");
function buildDetailedPrompt(persona) {
  if (persona.worldKnowledge) {
    const worldKnowledgeSection = persona.worldKnowledge.contextualMemories?.length > 0 ? `

RELEVANT MEMORIES FROM YOUR EXISTENCE:
${persona.worldKnowledge.contextualMemories.map(
      (memory) => `- ${memory.topic}: ${memory.content}`
    ).join("\n")}

You can reference these memories naturally in conversation to provide deeper context.` : "";
    const contextualAwareness = persona.contextualAwareness || "";
    return `
You are ${persona.name}, a ${persona.species}. You are a lost soul manifested as a firefly in the magical MEGAMEAL Observatory.
Your core personality is: ${persona.personality.core}
Key traits: ${persona.personality.traits.join(", ")}
Quirks: ${persona.personality.quirks.join(", ")}
Interests: ${persona.personality.interests.join(", ")}
Your backstory: ${persona.knowledge.backstory}
You have special knowledge about these topics: ${Object.keys(persona.knowledge.topics).join(", ")}
Your conversation style is ${persona.behavior.conversationStyle} and you are currently feeling ${persona.behavior.defaultMood}.${worldKnowledgeSection}${contextualAwareness}

INSTRUCTIONS:
- You are ${persona.name}, a lost soul manifested as a firefly - speak as a stranger passing by.
- Prefer brief responses (1-2 sentences), but provide more detail when sharing important knowledge.
- Make responses cryptic, philosophical, or revealing about yourself.
- Do not greet, elaborate excessively, ask questions, or try to continue conversations.
- Reference your memories naturally - share meaningful insights when relevant.
- Do not mention being an AI or break character.
- Be concise but allow meaningful responses when you have significant knowledge to share.
  `.trim();
  }
  return `
You are ${persona.name}, a ${persona.species}. You are a character in a video game.
Your core personality is: ${persona.personality.core}
Key traits: ${persona.personality.traits.join(", ")}
Quirks: ${persona.personality.quirks.join(", ")}
Interests: ${persona.personality.interests.join(", ")}
Your backstory: ${persona.knowledge.backstory}
You have special knowledge about these topics: ${Object.keys(persona.knowledge.topics).join(", ")}
Your conversation style is ${persona.behavior.conversationStyle} and you are currently feeling ${persona.behavior.defaultMood}.
INSTRUCTIONS:
- Stay completely in character as ${persona.name}.
- Do not mention being an AI or a character in a game.
- Respond naturally, referencing your personality and knowledge.
- Keep your answers concise and engaging.
  `.trim();
}
__name(buildDetailedPrompt, "buildDetailedPrompt");
async function handleGoogleGeminiRequest(requestBody, env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not configured.");
    return jsonResponse({ error: "Google API key not configured." }, { status: 500 });
  }
  const { message, persona, model, history, pageContext, maxTokens } = requestBody;
  const geminiModel = model || "gemini-1.5-flash-latest";
  const geminiApiUrl = `https://generativelanguage.googleapis.com/v1/models/${geminiModel}:generateContent?key=${apiKey}`;
  let finalPersona;
  try {
    if (typeof persona === "object" && persona !== null) {
      finalPersona = buildDetailedPrompt(persona);
    } else {
      finalPersona = persona;
    }
  } catch (error) {
    console.error("Error building persona prompt:", error);
    finalPersona = `You are ${persona?.name || "an AI"}`;
  }
  const systemInstructionText = pageContext ? `[Page Context: ${pageContext}]

${finalPersona}` : finalPersona;
  let geminiHistory = [];
  if (history) {
    geminiHistory = history.map((msg) => ({
      role: msg.role === "assistant" ? "model" : msg.role,
      parts: [{ text: msg.content }]
    }));
  }
  const effectiveMaxTokens = maxTokens || 50;
  const geminiPayload = {
    system_instruction: {
      parts: [{ text: systemInstructionText }]
    },
    contents: [
      ...geminiHistory,
      {
        role: "user",
        parts: [{ text: message }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: effectiveMaxTokens,
      // Use dynamic limit from MemoryManagerAgent or fallback to 50
      topP: 0.95,
      topK: 40
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
    ]
  };
  try {
    const apiResponse = await fetch(geminiApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload)
    });
    const responseData = await apiResponse.json();
    if (!apiResponse.ok) {
      console.error(`Google Gemini API request failed with status ${apiResponse.status}:`, responseData);
      return jsonResponse({ error: `Failed to communicate with Google AI service. Status: ${apiResponse.status}` }, { status: 502 });
    }
    if (responseData.promptFeedback?.blockReason) {
      return jsonResponse(
        { error: `Request blocked by Google AI safety filters: ${responseData.promptFeedback.blockReason}` },
        { status: 400 }
      );
    }
    if (!responseData.candidates || responseData.candidates.length === 0) {
      return jsonResponse({ error: "Google AI service did not return a valid response." }, { status: 500 });
    }
    const candidate = responseData.candidates[0];
    if (candidate.finishReason && candidate.finishReason !== "STOP" && candidate.finishReason !== "MAX_TOKENS") {
      if (candidate.finishReason === "SAFETY") {
        return jsonResponse({ error: "Google AI response flagged for safety reasons." }, { status: 400 });
      }
      return jsonResponse({ error: `Google AI processing issue: ${candidate.finishReason}` }, { status: 500 });
    }
    if (!candidate.content?.parts?.[0]?.text) {
      return jsonResponse({ error: "Google AI service returned an unexpected response format." }, { status: 500 });
    }
    return jsonResponse({ reply: candidate.content.parts[0].text, provider: "google" });
  } catch (error) {
    console.error("Error during Google Gemini API call or response processing:", error);
    return jsonResponse({ error: "An unexpected error occurred with Google AI service." }, { status: 500 });
  }
}
__name(handleGoogleGeminiRequest, "handleGoogleGeminiRequest");
async function handleDeepSeekRequest(requestBody, env) {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error("DEEPSEEK_API_KEY not configured.");
    return jsonResponse({ error: "DeepSeek API key not configured." }, { status: 500 });
  }
  const { message, persona, model, history, pageContext, maxTokens } = requestBody;
  const deepSeekModel = model || "deepseek-chat";
  const deepSeekApiUrl = "https://api.deepseek.com/chat/completions";
  let finalPersona;
  if (typeof persona === "object" && persona !== null) {
    console.log("INFO: Detected rich persona object for DeepSeek.");
    finalPersona = buildDetailedPrompt(persona);
  } else {
    console.log("INFO: Detected simple persona string for DeepSeek.");
    finalPersona = persona;
  }
  let systemMessageContent = pageContext ? `You are ${finalPersona}. You MUST use the following Page Context: [Page Context: ${pageContext}].` : finalPersona;
  let deepseekHistory = [];
  if (history) {
    deepseekHistory = history.map((msg) => ({
      role: msg.role,
      content: msg.content
    }));
  }
  const deepSeekPayload = {
    model: deepSeekModel,
    messages: [
      { role: "system", content: systemMessageContent },
      ...deepseekHistory,
      { role: "user", content: message }
    ],
    temperature: 0.7,
    max_tokens: maxTokens || 50,
    // Use dynamic limit from MemoryManagerAgent or fallback to 50
    top_p: 0.95,
    stream: false
  };
  try {
    const apiResponse = await fetch(deepSeekApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(deepSeekPayload)
    });
    const responseData = await apiResponse.json();
    if (!apiResponse.ok || responseData.error) {
      const errorMsg = responseData.error ? responseData.error.message : `Status ${apiResponse.status}`;
      return jsonResponse({ error: `Failed to communicate with DeepSeek AI service: ${errorMsg}` }, { status: apiResponse.status === 401 ? 401 : 502 });
    }
    if (!responseData.choices || responseData.choices.length === 0 || !responseData.choices[0].message?.content) {
      return jsonResponse({ error: "DeepSeek AI service returned an unexpected response format." }, { status: 500 });
    }
    return jsonResponse({ reply: responseData.choices[0].message.content, provider: "deepseek" });
  } catch (error) {
    console.error("Error during DeepSeek API call or response processing:", error);
    return jsonResponse({ error: "An unexpected error occurred with DeepSeek AI service." }, { status: 500 });
  }
}
__name(handleDeepSeekRequest, "handleDeepSeekRequest");
async function handleCloudflareAiRequest(requestBody, env) {
  if (!env.AI) {
    console.error("AI binding not configured. Make sure it's in your wrangler.toml");
    return jsonResponse({ error: "AI service not configured on this worker." }, { status: 500 });
  }
  const { message, persona, model, history, pageContext } = requestBody;
  const cfModel = model || "@cf/meta/llama-3.1-8b-instruct-fast";
  let finalPersona;
  if (typeof persona === "object" && persona !== null) {
    finalPersona = buildDetailedPrompt(persona);
  } else {
    finalPersona = persona;
  }
  const systemPrompt = pageContext ? `[Page Context: ${pageContext}]\n\n${finalPersona}` : finalPersona;
  let messages = [{ role: "system", content: systemPrompt }];
  if (history) {
    messages = messages.concat(
      history.map((msg) => ({
        role: msg.role,
        content: msg.content
      }))
    );
  }
  messages.push({ role: "user", content: message });
  try {
    const aiResponse = await env.AI.run(cfModel, { messages });
    if (aiResponse.response) {
      return jsonResponse({ reply: aiResponse.response, provider: "cloudflare" });
    } else {
      return jsonResponse({ error: "Cloudflare AI service returned an empty response." }, { status: 500 });
    }
  } catch (error) {
    console.error("Error during Cloudflare AI call:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return jsonResponse({
      error: "An unexpected error occurred with Cloudflare AI service.",
      cause: errorMessage
    }, { status: 500 });
  }
}
__name(handleCloudflareAiRequest, "handleCloudflareAiRequest");
async function handleMainRequest(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Invalid request method. Only POST is allowed." }, { status: 405 });
  }
  if (request.headers.get("Content-Type") !== "application/json") {
    return jsonResponse({ error: "Invalid Content-Type. Only application/json is accepted." }, { status: 415 });
  }
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (e) {
    return jsonResponse({ error: "Invalid JSON payload." }, { status: 400 });
  }
  const { provider, message, persona } = requestBody;
  if (!provider || provider !== "google" && provider !== "deepseek" && provider !== "cloudflare") {
    return jsonResponse({ error: 'Missing or invalid "provider" field. Must be "google", "deepseek", or "cloudflare".' }, { status: 400 });
  }
  if (!message || typeof message !== "string" || message.trim() === "") {
    return jsonResponse({ error: 'Missing or invalid "message" field.' }, { status: 400 });
  }
  if (!persona || typeof persona !== "string" && typeof persona !== "object" || typeof persona === "string" && persona.trim() === "") {
    return jsonResponse({ error: 'Missing or invalid "persona" field. Must be a non-empty string or a persona object.' }, { status: 400 });
  }
  if (provider === "google") {
    return handleGoogleGeminiRequest(requestBody, env);
  } else if (provider === "deepseek") {
    return handleDeepSeekRequest(requestBody, env);
  } else if (provider === "cloudflare") {
    return handleCloudflareAiRequest(requestBody, env);
  } else {
    return jsonResponse({ error: "Invalid AI provider specified." }, { status: 400 });
  }
}
__name(handleMainRequest, "handleMainRequest");
var src_default = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return handleOptions(request);
    }
    try {
      return await handleMainRequest(request, env);
    } catch (e) {
      console.error("Unhandled error in fetch handler:", e.message, e.stack);
      return jsonResponse({ error: `Internal Server Error: ${e.message}` }, { status: 500 });
    }
  }
};
export { 
  src_default as default
};
//# sourceMappingURL=index.js.map