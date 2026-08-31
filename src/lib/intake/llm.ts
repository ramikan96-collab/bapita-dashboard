import OpenAI from "openai";
import { GROQ_MODELS, OLLAMA_MODEL, SYSTEM_INSTRUCTION } from "./prompt";

/** The LLM returned something that is not JSON. Carries the raw text for the caller's 422. */
export class LlmJsonError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super("LLM returned invalid JSON");
    this.name = "LlmJsonError";
    this.detail = detail;
  }
}

export function hasLlmProvider(): boolean {
  return Boolean(process.env.GROQ_API_KEY || process.env.OLLAMA_BASE_URL);
}

export async function callLLM(userMessage: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const ollamaUrl = process.env.OLLAMA_BASE_URL;

  if (groqKey) {
    const client = new OpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1" });
    let lastErr: unknown = null;

    for (const model of GROQ_MODELS) {
      try {
        const res = await client.chat.completions.create({
          model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user",   content: userMessage },
          ],
          temperature: 0.3,
        });
        const text = res.choices[0]?.message?.content ?? "";
        if (text) return text;
        lastErr = new Error(`Groq model ${model} returned an empty completion`);
      } catch (err) {
        lastErr = err;
        const status = (err as { status?: number })?.status;
        const retryable = status === 404 || status === 400 || status === 429 || status === 503;
        if (!retryable) break;
        console.warn(`[intake] Groq model ${model} unusable (status ${status}) — trying next`);
      }
    }

    if (!ollamaUrl) throw lastErr ?? new Error("Groq call failed");
    console.warn("[intake] All Groq models failed — falling back to Ollama", String(lastErr));
  }

  if (ollamaUrl) {
    const client = new OpenAI({ apiKey: "ollama", baseURL: `${ollamaUrl}/v1` });
    const res = await client.chat.completions.create({
      model: OLLAMA_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user",   content: userMessage },
      ],
      temperature: 0.3,
    });
    return res.choices[0]?.message?.content ?? "";
  }

  throw new Error("No LLM provider configured (GROQ_API_KEY or OLLAMA_BASE_URL required)");
}

/** callLLM plus the JSON parse the admin route has always done inline. */
export async function generateBusinessDraft(userMessage: string): Promise<Record<string, unknown>> {
  const text = await callLLM(userMessage);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    console.error("[intake] JSON parse failed, raw:", text);
    throw new LlmJsonError(text.slice(0, 500));
  }
}
