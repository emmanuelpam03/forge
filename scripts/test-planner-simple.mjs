// Lightweight planner simulation to verify mapping from structured tool_usage to concrete tools
const message = "What's the weather in Flic en Flac, Mauritius?";

function mapStructuredToolUsage(toolUsage) {
  return toolUsage
    .map((tool) => {
      switch (tool) {
        case "web_search":
          return "webSearch";
        case "weather":
          return "weather";
        case "datetime":
          return "currentDateTime";
        case "project_context":
          return "projectContextLookup";
        case "code_execution":
          return "calculator";
        case "memory_lookup":
          return null;
        default:
          return null;
      }
    })
    .filter((t) => Boolean(t));
}

function extractWeatherLocation(message) {
  const cleaned = message.trim();

  const locationMatch = cleaned.match(
    /\b(?:weather|forecast|temperature|conditions?)\b.*?\b(?:in|for|at|near)\s+([^?.!;]+?)(?:\s+(?:today|tomorrow|now|currently|right now)\b|[?.!;]|$)/i,
  );
  if (locationMatch?.[1]) {
    return locationMatch[1].trim().replace(/^(the|a|an)\s+/i, "");
  }

  const fallbackMatch = cleaned.match(
    /\b(?:in|for|at|near)\s+([^?.!;]+?)(?:\s+(?:today|tomorrow|now|currently|right now)\b|[?.!;]|$)/i,
  );
  if (fallbackMatch?.[1]) {
    return fallbackMatch[1].trim().replace(/^(the|a|an)\s+/i, "");
  }

  return cleaned;
}

// Simulate planner resolution
const structured = ['weather'];
const structuredTools = mapStructuredToolUsage(structured);
const selectedTools = []; // no UI selections
const inferredTools = [];

const final = Array.from(new Set([...structuredTools, ...selectedTools, ...inferredTools]));

console.log('Structured tool usage:', structured);
console.log('Mapped tools:', structuredTools);
console.log('Final plan:', final);
console.log('Extracted weather location:', extractWeatherLocation(message));
