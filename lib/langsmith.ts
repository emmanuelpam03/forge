import "server-only";

export type LangSmithConfig = {
  tracing: boolean;
  apiKey?: string;
  project?: string;
  endpoint?: string;
};

export function getLangSmithConfig(): LangSmithConfig {
  return {
    tracing: process.env.LANGSMITH_TRACING === "true",
    apiKey: process.env.LANGSMITH_API_KEY?.trim() || undefined,
    project: process.env.LANGSMITH_PROJECT?.trim() || "forge",
    endpoint: process.env.LANGSMITH_ENDPOINT?.trim() || undefined,
  };
}

export function assertLangSmithConfig(): LangSmithConfig {
  const config = getLangSmithConfig();

  if (config.tracing && !config.apiKey) {
    throw new Error(
      "LANGSMITH_API_KEY is required when LANGSMITH_TRACING=true.",
    );
  }

  if (config.tracing && !config.project) {
    throw new Error(
      "LANGSMITH_PROJECT is required when LANGSMITH_TRACING=true.",
    );
  }

  return config;
}
