import { notFound } from "next/navigation";
import { getChatById } from "@/lib/actions/chats";
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

  return (
    <ChatClient
      chatId={chat.id}
      title={chat.title}
      initialMessage={initialMessage}
      initialMessages={chat.messages
        .filter(
          (message) => message.role === "user" || message.role === "assistant",
        )
        .map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        }))}
    />
  );
}
