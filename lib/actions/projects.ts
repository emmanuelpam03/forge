"use server";

import prisma from "@/lib/prisma";
import { getServerSessionFromRequest } from "@/lib/server-auth";
import { revalidatePath } from "next/cache";
import { error as logError } from "@/lib/logger";

export async function createProject(name: string = "New Project") {
  try {
    const session = await getServerSessionFromRequest(undefined);
    const userId = session?.user?.id ?? null;
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: null,
        userId,
      },
    });

    revalidatePath("/", "layout");
    return { success: true, project };
  } catch (error) {
    logError("create_project_failed", { error });
    return { success: false, error: "Failed to create project" };
  }
}

export async function updateProject(
  id: string,
  data: { name?: string; description?: string; color?: string },
) {
  try {
    const session = await getServerSessionFromRequest(undefined);
    const userId = session?.user?.id ?? null;
    if (!userId) return { success: false, error: "Unauthorized" };

    // enforce ownership
    const existing = await prisma.project.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== userId) return { success: false, error: "Not found" };

    const project = await prisma.project.update({
      where: { id },
      data,
    });

    revalidatePath("/", "layout");
    return { success: true, project };
  } catch (error) {
    logError("update_project_failed", { id, error });
    return { success: false, error: "Failed to update project" };
  }
}

export async function deleteProject(id: string) {
  try {
    const session = await getServerSessionFromRequest(undefined);
    const userId = session?.user?.id ?? null;
    if (!userId) return { success: false, error: "Unauthorized" };

    const existing = await prisma.project.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== userId) return { success: false, error: "Not found" };

    await prisma.project.delete({ where: { id } });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    logError("delete_project_failed", { id, error });
    return { success: false, error: "Failed to delete project" };
  }
}

export async function getProjects() {
  try {
    const session = await getServerSessionFromRequest(undefined);
    const userId = session?.user?.id ?? null;
    if (!userId) return [];

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    return projects;
  } catch (error) {
    logError("get_projects_failed", { error });
    return [];
  }
}

export async function getProjectById(id: string) {
  try {
    const session = await getServerSessionFromRequest(undefined);
    const userId = session?.user?.id ?? null;
    if (!userId) return null;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.userId !== userId) return null;
    return project;
  } catch (error) {
    logError("get_project_failed", { id, error });
    return null;
  }
}
