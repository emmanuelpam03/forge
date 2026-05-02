import { notFound } from "next/navigation";
import { getChatById } from "@/lib/actions/chats";
import { getBranchesForParent } from "@/lib/actions/messages";
import { ChatClient } from "./ChatClient";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ chatId: string }>;
  searchParams: Promise<{ initialMessage?: string }>;
}) {
  const { chatId } = await params;
  const { initialMessage } = await searchParams;
  const chat = await getChatById(chatId);

  if (!chat) {
    notFound();
  }

  const assistantMessages = chat.messages.filter(
    (message) => message.role === "assistant",
  );

  const effectiveAssistantParentIds = new Map<string, string | null>();
  let lastUserMessageId: string | null = null;

  for (const message of chat.messages) {
    if (message.role === "user") {
      lastUserMessageId = message.id;
      continue;
    }

    if (message.role !== "assistant") {
      continue;
    }

    effectiveAssistantParentIds.set(
      message.id,
      message.parentId ?? lastUserMessageId,
    );
  }

  const parentIds = Array.from(
    new Set(
      Array.from(effectiveAssistantParentIds.values()).filter(
        (parentId): parentId is string => !!parentId,
      ),
    ),
  );

  const branchEntries = await Promise.all(
    parentIds.map(
      async (parentId) =>
        [parentId, await getBranchesForParent(parentId)] as const,
    ),
  );
  const branchesByParentId = Object.fromEntries(branchEntries);

  const latestAssistantByParentId = new Map<
    string,
    (typeof assistantMessages)[number]
  >();
  for (const message of assistantMessages) {
    const effectiveParentId = effectiveAssistantParentIds.get(message.id);
    if (!effectiveParentId) {
      continue;
    }

    latestAssistantByParentId.set(effectiveParentId, message);
  }

  const initialMessages: Array<Record<string, unknown>> = [];
  for (const message of chat.messages) {
    if (message.role === "user") {
      initialMessages.push({
        id: message.id,
        role: message.role,
        content: message.content,
      });
      continue;
    }

    if (message.role !== "assistant") continue;

    const effectiveParentId =
      effectiveAssistantParentIds.get(message.id) ?? message.parentId;

    if (!effectiveParentId) {
      initialMessages.push({
        id: message.id,
        role: message.role,
        content: message.content,
        parentId: message.parentId,
        branchId: message.branchId,
      });
      continue;
    }

    const latestBranch = latestAssistantByParentId.get(effectiveParentId);
    if (!latestBranch || latestBranch.id !== message.id) {
      continue;
    }

    const branchOptions = branchesByParentId[effectiveParentId] ?? [];
    initialMessages.push({
      id: message.id,
      role: message.role,
      content: message.content,
      parentId: effectiveParentId,
      branchId: message.branchId,
      branchOptions: branchOptions.map((branch) => ({
        id: branch.id,
        content: branch.content,
        parentId: branch.parentId,
        branchId: branch.branchId,
        createdAt: branch.createdAt.toISOString(),
      })),
    });
  }

  return (
    <ChatClient
      chatId={chat.id}
      projectId={chat.projectId}
      title={chat.title}
      initialMessage={initialMessage}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- server-to-client shape is simplified here
      initialMessages={initialMessages as any}
    />
  );
}
