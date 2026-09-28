/**
 * Minimal model gateway (server-only). One internal interface — `complete()` — with
 * provider adapters behind it. The rest of the app never talks to a provider directly,
 * which is what lets users switch models without anything else changing.
 */

export type Provider = "anthropic" | "openai" | "google";

interface CompleteArgs {
  model: string;
  system: string;
  user: string;
  json?: boolean;
}

interface Adapter {
  available: () => boolean;
  defaultModel: () => string;
  complete: (a: CompleteArgs) => Promise<string>;
}

const adapters: Record<Provider, Adapter> = {
  anthropic: {
    available: () => Boolean(process.env.ANTHROPIC_API_KEY),
    defaultModel: () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    async complete({ model, system, user }) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model, max_tokens: 2000, system, messages: [{ role: "user", content: user }] }),
      });
      if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
    },
  },
  openai: {
    available: () => Boolean(process.env.OPENAI_API_KEY),
    defaultModel: () => process.env.OPENAI_MODEL || "gpt-5",
    async complete({ model, system, user, json }) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          ...(json ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? "";
    },
  },
  google: {
    available: () => Boolean(process.env.GEMINI_API_KEY),
    defaultModel: () => process.env.GEMINI_MODEL || "gemini-2.5-pro",
    async complete({ model, system, user, json }) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: json ? { responseMimeType: "application/json" } : undefined,
          }),
        },
      );
      if (!res.ok) throw new Error(`google ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    },
  },
};

const PROVIDER_OF: Record<string, Provider> = {
  "claude-opus-5-5": "anthropic",
  "claude-sonnet-5": "anthropic",
  "gpt-5": "openai",
  "gemini-2.5-pro": "google",
};

export function availableProviders(): Provider[] {
  return (Object.keys(adapters) as Provider[]).filter((p) => adapters[p].available());
}

/** Resolve a requested model to a concrete (provider, model), with fallback to any configured provider. */
export function route(requested: string): { provider: Provider; model: string } | null {
  const wanted = PROVIDER_OF[requested];
  if (wanted && adapters[wanted].available()) return { provider: wanted, model: requested };
  const order: Provider[] = ["anthropic", "openai", "google"];
  const fallback = order.find((p) => adapters[p].available());
  return fallback ? { provider: fallback, model: adapters[fallback].defaultModel() } : null;
}

export async function complete(requested: string, args: Omit<CompleteArgs, "model">) {
  const r = route(requested);
  if (!r) throw new Error("no provider configured");
  const text = await adapters[r.provider].complete({ ...args, model: r.model });
  return { text, ...r };
}

export function extractJson<T>(text: string): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
