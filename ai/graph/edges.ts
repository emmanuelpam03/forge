export const CHAT_GRAPH_NODES = {
  loadContext: "loadContext",
  classifyIntent: "classifyIntent",
  planTask: "planTask",
  toolRouter: "toolRouter",
  synthesizeEvidence: "synthesizeEvidence",
  suggestTask: "suggestTask",
  generateResponse: "generateResponse",
  saveMessages: "saveMessages",
  generateTitle: "generateTitle",
  extractMemory: "extractMemory",
} as const;

type ChatGraphEdgeEndpoint =
  | "__start__"
  | "__end__"
  | (typeof CHAT_GRAPH_NODES)[keyof typeof CHAT_GRAPH_NODES];

export const CHAT_GRAPH_EDGE_LIST = [
  ["__start__", CHAT_GRAPH_NODES.loadContext],
  [CHAT_GRAPH_NODES.loadContext, CHAT_GRAPH_NODES.classifyIntent],
  [CHAT_GRAPH_NODES.classifyIntent, CHAT_GRAPH_NODES.planTask],
  [CHAT_GRAPH_NODES.planTask, CHAT_GRAPH_NODES.toolRouter],
  [CHAT_GRAPH_NODES.toolRouter, CHAT_GRAPH_NODES.synthesizeEvidence],
  [CHAT_GRAPH_NODES.synthesizeEvidence, CHAT_GRAPH_NODES.suggestTask],
  [CHAT_GRAPH_NODES.suggestTask, CHAT_GRAPH_NODES.generateResponse],
  [CHAT_GRAPH_NODES.generateResponse, CHAT_GRAPH_NODES.saveMessages],
  [CHAT_GRAPH_NODES.saveMessages, CHAT_GRAPH_NODES.generateTitle],
  [CHAT_GRAPH_NODES.generateTitle, CHAT_GRAPH_NODES.extractMemory],
  [CHAT_GRAPH_NODES.extractMemory, "__end__"],
] as const satisfies readonly [ChatGraphEdgeEndpoint, ChatGraphEdgeEndpoint][];
