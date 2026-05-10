import { z } from "zod";

export const SELECTED_OPTION_IDS = [
  "search",
  "research",
  "analysis",
  "coding",
] as const;

export type SelectedOptionId = (typeof SELECTED_OPTION_IDS)[number];

export const SELECTED_OPTION_LABELS: Record<SelectedOptionId, string> = {
  search: "Search",
  research: "Research",
  analysis: "Analysis",
  coding: "Coding",
};

export const selectedOptionIdSchema = z.enum(SELECTED_OPTION_IDS);
