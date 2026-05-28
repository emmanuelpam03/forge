import { getProjects } from "@/lib/actions/projects";
import { getRecentChatsPage } from "@/lib/actions/chats";
import { SidebarClient, ProjectItemData, ChatItemData } from "./SidebarClient";

const RECENT_CHAT_PAGE_SIZE = 20;

export default async function Sidebar() {
  const projects = await getProjects();
  const { chats } = await getRecentChatsPage({ limit: RECENT_CHAT_PAGE_SIZE });

  const projectsData: ProjectItemData[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const chatsData: ChatItemData[] = chats.map((c) => ({
    id: c.id,
    title: c.title,
    lastMessageAt: c.lastMessageAt.toISOString(),
  }));

  return (
    <SidebarClient initialProjects={projectsData} initialChats={chatsData} />
  );
}
