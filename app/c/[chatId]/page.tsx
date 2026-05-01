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
  const parentIds = Array.from(
    new Set(
      assistantMessages
        .map((message) => message.parentId)
        .filter((parentId): parentId is string => !!parentId),
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
    if (!message.parentId) {
      continue;
    }

    latestAssistantByParentId.set(message.parentId, message);
  }

  const initialMessages = chat.messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant",
    )
    .flatMap((message) => {
      if (message.role === "user") {
        return [
          {
            id: message.id,
            role: message.role,
            content: message.content,
          },
        ];
      }

      if (!message.parentId) {
        return [
          {
            id: message.id,
            role: message.role,
            content: message.content,
            parentId: message.parentId,
            branchId: message.branchId,
          },
        ];
      }

      const latestBranch = latestAssistantByParentId.get(message.parentId);
      if (!latestBranch || latestBranch.id !== message.id) {
        return [];
      }

      const branchOptions = branchesByParentId[message.parentId] ?? [];

      return [
        {
          id: message.id,
          role: message.role,
          content: message.content,
          parentId: message.parentId,
          branchId: message.branchId,
          branchOptions: branchOptions.map((branch) => ({
            id: branch.id,
            content: branch.content,
            parentId: branch.parentId,
            branchId: branch.branchId,
            createdAt: branch.createdAt.toISOString(),
          })),
        },
      ];
    });

  return (
    <ChatClient
      chatId={chat.id}
      title={chat.title}
      initialMessage={initialMessage}
      initialMessages={initialMessages}
    />
  );
}
