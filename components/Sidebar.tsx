import { getProjects } from "@/lib/actions/projects";
import { getRecentChats } from "@/lib/actions/chats";
import { SidebarClient, ProjectItemData, ChatItemData } from "./SidebarClient";

export default async function Sidebar() {
  const projects = await getProjects();
  const chats = await getRecentChats(5);

  const projectsData: ProjectItemData[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const chatsData: ChatItemData[] = chats.map((c) => ({
    id: c.id,
    title: c.title,
  }));

  return (
    <SidebarClient initialProjects={projectsData} initialChats={chatsData} />
  );
}
