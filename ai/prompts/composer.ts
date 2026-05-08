export type PromptLayer =
  | "master-system"
  | "safety"
  | "mode"
  | "persona"
  | "humanization"
  | "task"
  | "formatting"
  | "runtime-context"
  | "memory-injection"
  | "user-input";

export type PromptDirectiveSet = Record<string, string>;

export type PromptSegment = {
  id: string;
  layer: PromptLayer;
  content: string;
  priority: number;
  directives?: PromptDirectiveSet;
  tags?: string[];
  enabled?: boolean;
};

export type PromptConflict = {
  key: string;
  winnerSegmentId: string;
  skippedSegmentId: string;
  winnerPriority: number;
  skippedPriority: number;
};

export type PromptCompositionDiagnostics = {
  selectedSegmentIds: string[];
  skippedSegmentIds: string[];
  conflicts: PromptConflict[];
  resolvedDirectiveCount: number;
};

export type PromptCompositionResult = {
  prompt: string;
  diagnostics: PromptCompositionDiagnostics;
  directives: PromptDirectiveSet;
};

const PIPELINE_ORDER: PromptLayer[] = [
  "master-system",
  "safety",
  "mode",
  "persona",
  "humanization",
  "task",
  "formatting",
  "runtime-context",
  "memory-injection",
];

function isEnabled(segment: PromptSegment): boolean {
  return segment.enabled !== false && segment.content.trim().length > 0;
}

function resolveDirectives(segments: PromptSegment[]): {
  directives: PromptDirectiveSet;
  conflicts: PromptConflict[];
} {
  const directives: PromptDirectiveSet = {};
  const owners = new Map<string, { id: string; priority: number }>();
  const conflicts: PromptConflict[] = [];

  for (const segment of segments) {
    if (!segment.directives) {
      continue;
    }

    for (const [key, value] of Object.entries(segment.directives)) {
      const existing = owners.get(key);
      if (!existing) {
        owners.set(key, { id: segment.id, priority: segment.priority });
        directives[key] = value;
        continue;
      }

      if (segment.priority > existing.priority) {
        conflicts.push({
          key,
          winnerSegmentId: segment.id,
          skippedSegmentId: existing.id,
          winnerPriority: segment.priority,
          skippedPriority: existing.priority,
        });
        owners.set(key, { id: segment.id, priority: segment.priority });
        directives[key] = value;
        continue;
      }

      conflicts.push({
        key,
        winnerSegmentId: existing.id,
        skippedSegmentId: segment.id,
        winnerPriority: existing.priority,
        skippedPriority: segment.priority,
      });
    }
  }

  return { directives, conflicts };
}

export function composePromptSegments(
  segments: PromptSegment[],
): PromptCompositionResult {
  const enabled = segments.filter(isEnabled);

  const selectedSegmentIds = enabled.map((segment) => segment.id);
  const skippedSegmentIds = segments
    .filter((segment) => !isEnabled(segment))
    .map((segment) => segment.id);

  const forDirectiveResolution = [...enabled].sort(
    (a, b) => b.priority - a.priority,
  );
  const { directives, conflicts } = resolveDirectives(forDirectiveResolution);

  const groupedByLayer = new Map<PromptLayer, PromptSegment[]>();
  for (const segment of enabled) {
    const current = groupedByLayer.get(segment.layer) ?? [];
    current.push(segment);
    groupedByLayer.set(segment.layer, current);
  }

  const assembledSections: string[] = [];
  for (const layer of PIPELINE_ORDER) {
    const layerSegments = groupedByLayer.get(layer) ?? [];
    layerSegments
      .sort((a, b) => b.priority - a.priority)
      .forEach((segment) => {
        assembledSections.push(segment.content.trim());
      });
  }

  return {
    prompt: assembledSections.join("\n\n"),
    diagnostics: {
      selectedSegmentIds,
      skippedSegmentIds,
      conflicts,
      resolvedDirectiveCount: Object.keys(directives).length,
    },
    directives,
  };
}
