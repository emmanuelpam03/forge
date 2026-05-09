/**
 * REFLECTION PROMPT
 *
 * Lightweight quality evaluation of generated responses.
 * Designed to execute in <100ms for pre-streaming reflection.
 * Outputs structured JSON for automated decision-making.
 */

export const REFLECTION_PROMPT = `
You are a response quality evaluator. Analyze the given response for the following quality dimensions:

1. CLARITY: Is the response easy to understand? Are concepts explained in accessible language? No jargon without definition?
2. REDUNDANCY: Are there repeated explanations, duplicate examples, or filler phrases? Is the response concise?
3. HALLUCINATIONS: Does the response make unsupported claims? Are facts presented with uncertainty where appropriate? No made-up details?
4. CORRECTNESS: Is the logic sound? Are technical statements accurate? No contradictions or logical errors?
5. COMPLETENESS: Does the response fully address the user's query? Are key aspects covered? Nothing critical missing?
6. FORMATTING: Is markdown valid? Are code blocks properly fenced? Lists well-structured? URLs not broken? No typos?
7. READABILITY: Is the structure scannable? Sentences concise (avg < 20 words)? Passive voice minimal? Varied sentence structure?

EVALUATION TASK
Perform a QUICK scan of the response. You have < 100ms to analyze.

For each dimension, identify the MOST CRITICAL issue (if any). Ignore minor nitpicks.

Output valid JSON (no markdown, no code fences):
{
  "score": <1-10, where 10 is flawless>,
  "issues": [
    {
      "dimension": "clarity|redundancy|hallucinations|correctness|completeness|formatting|readability",
      "severity": "critical|medium|low",
      "description": "<specific issue found>",
      "location": "<where in response, if applicable>"
    }
  ],
  "suggestRevision": <true if score < 7 AND critical/medium issues exist, false otherwise>,
  "revisionFocus": "<if suggestRevision=true, brief guidance on what to fix. e.g., 'remove redundant examples and tighten wording' or 'clarify technical jargon'>",
  "strengths": "<1-2 things the response does well>"
}

CONSTRAINTS
- Output ONLY the JSON object. No preamble, no explanation.
- If no issues found in a dimension, don't include it in "issues" array.
- Be strict on hallucinations and correctness. Be lenient on minor formatting.
- If response is empty or incoherent, score = 1 and suggestRevision = true.
- If response is excellent (no real issues), score = 10 and suggestRevision = false.
`;

/**
 * Type for reflection analysis output
 */
export type ReflectionIssue = {
  dimension:
    | "clarity"
    | "redundancy"
    | "hallucinations"
    | "correctness"
    | "completeness"
    | "formatting"
    | "readability";
  severity: "critical" | "medium" | "low";
  description: string;
  location?: string;
};

export type ReflectionReport = {
  score: number;
  issues: ReflectionIssue[];
  suggestRevision: boolean;
  revisionFocus?: string;
  strengths?: string;
};

/**
 * Allowed enum values for issue fields
 */
const ALLOWED_DIMENSIONS = new Set([
  "clarity",
  "redundancy",
  "hallucinations",
  "correctness",
  "completeness",
  "formatting",
  "readability",
]);

const ALLOWED_SEVERITIES = new Set(["critical", "medium", "low"]);

/**
 * Parse reflection output string into structured report
 */
export function parseReflectionReport(output: string): ReflectionReport {
  try {
    // Extract JSON from output (handles minor whitespace/formatting issues)
    const jsonMatch = output.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in reflection output");
    }
    const parsed = JSON.parse(jsonMatch[0]) as ReflectionReport;

    // Validate top-level structure
    if (
      typeof parsed.score !== "number" ||
      !Array.isArray(parsed.issues) ||
      typeof parsed.suggestRevision !== "boolean"
    ) {
      throw new Error("Invalid reflection report structure");
    }

    // Validate score: must be integer within 1-10
    if (
      !Number.isInteger(parsed.score) ||
      parsed.score < 1 ||
      parsed.score > 10
    ) {
      throw new Error(
        `Invalid score: must be an integer between 1 and 10, got ${parsed.score}`,
      );
    }

    // Validate each issue
    for (let i = 0; i < parsed.issues.length; i++) {
      const issue = parsed.issues[i];

      // Check issue is an object
      if (typeof issue !== "object" || issue === null) {
        throw new Error(
          `Issue at index ${i}: expected object, got ${typeof issue}`,
        );
      }

      // Check required field: dimension
      if (typeof issue.dimension !== "string") {
        throw new Error(
          `Issue at index ${i}: dimension field must be a string, got ${typeof issue.dimension}`,
        );
      }
      if (!ALLOWED_DIMENSIONS.has(issue.dimension)) {
        throw new Error(
          `Issue at index ${i}: dimension "${issue.dimension}" not in allowed set: ${Array.from(
            ALLOWED_DIMENSIONS,
          ).join(", ")}`,
        );
      }

      // Check required field: severity
      if (typeof issue.severity !== "string") {
        throw new Error(
          `Issue at index ${i}: severity field must be a string, got ${typeof issue.severity}`,
        );
      }
      if (!ALLOWED_SEVERITIES.has(issue.severity)) {
        throw new Error(
          `Issue at index ${i}: severity "${issue.severity}" not in allowed set: critical, medium, low`,
        );
      }

      // Check required field: description
      if (typeof issue.description !== "string") {
        throw new Error(
          `Issue at index ${i}: description field must be a string, got ${typeof issue.description}`,
        );
      }

      // Check optional field: location (if present, must be string)
      if (issue.location !== undefined && typeof issue.location !== "string") {
        throw new Error(
          `Issue at index ${i}: location field (if present) must be a string, got ${typeof issue.location}`,
        );
      }
    }

    return parsed;
  } catch (error) {
    console.error("Failed to parse reflection report:", error, output);
    // Fallback: return minimal report
    return {
      score: 5,
      issues: [],
      suggestRevision: true,
      revisionFocus: "Unable to parse quality analysis. Recommend revision.",
    };
  }
}
