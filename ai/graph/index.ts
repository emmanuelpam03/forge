import "server-only";

import { END, START, StateGraph } from "@langchain/langgraph";
import {
  createChatGraphSeed,
  chatGraphState,
  type ChatGraphInput,
} from "@/ai/graph/state";
import { CHAT_GRAPH_EDGE_LIST, CHAT_GRAPH_NODES } from "@/ai/graph/edges";
import {
  generateResponseNode,
  loadContextNode,
  saveMessagesNode,
} from "@/ai/graph/nodes";

const graphBuilder = new StateGraph(chatGraphState)
  .addNode(CHAT_GRAPH_NODES.loadContext, loadContextNode)
  .addNode(CHAT_GRAPH_NODES.generateResponse, generateResponseNode)
  .addNode(CHAT_GRAPH_NODES.saveMessages, saveMessagesNode)
  .addEdge(START, CHAT_GRAPH_NODES.loadContext)
  .addEdge(CHAT_GRAPH_NODES.loadContext, CHAT_GRAPH_NODES.generateResponse)
  .addEdge(CHAT_GRAPH_NODES.generateResponse, CHAT_GRAPH_NODES.saveMessages)
  .addEdge(CHAT_GRAPH_NODES.saveMessages, END);

export const chatGraph = graphBuilder.compile();

export async function runChatGraph(input: ChatGraphInput) {
  return chatGraph.invoke(createChatGraphSeed(input));
}
