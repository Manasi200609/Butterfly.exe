const env = require("../config/env");

function createAiService() {
  return {
    isConfigured: () => Boolean(env.geminiApiKey),
    async extractRequirements(sourceText) {
      if (!env.geminiApiKey) throw new Error("Gemini is not configured.");
      const { GoogleGenAI } = require("@google/genai");
      const client = new GoogleGenAI({ apiKey: env.geminiApiKey });
      const result = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Extract only explicit scholarship application requirements from this notice. Return JSON array with fields text, category (document|deadline|prerequisite|other), deadline (exact text or null), mandatory (boolean or null), certainty (explicit|interpretation), evidence {quote,start,end}. start/end are zero-based offsets in the exact notice. Never infer. Notice:\n${sourceText}`,
        config: { responseMimeType: "application/json", responseSchema: { type: "ARRAY", items: { type: "OBJECT", properties: { text: { type: "STRING" }, category: { type: "STRING" }, deadline: { type: "STRING", nullable: true }, mandatory: { type: "BOOLEAN", nullable: true }, certainty: { type: "STRING" }, evidence: { type: "OBJECT", properties: { quote: { type: "STRING" }, start: { type: "INTEGER" }, end: { type: "INTEGER" } }, required: ["quote", "start", "end"] } }, required: ["text", "category", "evidence"] } } },
      });
      return JSON.parse(result.text);
    },
  };
}

module.exports = { createAiService };
