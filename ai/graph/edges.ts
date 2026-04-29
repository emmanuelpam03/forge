export const CHAT_GRAPH_NODES = {
  loadContext: "loadContext",
  classifyIntent: "classifyIntent",
  planTask: "planTask",
  toolRouter: "toolRouter",
  synthesizeEvidence: "synthesizeEvidence",
  generateResponse: "generateResponse",
  saveMessages: "saveMessages",
  generateTitle: "generateTitle",
  extractMemory: "extractMemory",
} as const;

export const CHAT_GRAPH_EDGE_LIST = [
  ["__start__", CHAT_GRAPH_NODES.loadContext],
  [CHAT_GRAPH_NODES.loadContext, CHAT_GRAPH_NODES.generateResponse],
  [CHAT_GRAPH_NODES.generateResponse, CHAT_GRAPH_NODES.saveMessages],
  [CHAT_GRAPH_NODES.saveMessages, "__end__"],
] as const;
