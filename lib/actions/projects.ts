"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { error as logError } from "@/lib/logger";

export async function createProject(name: string = "New Project") {
  try {
    const project = await prisma.project.create({
      data: {
        name,
        description: null,
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
    await prisma.project.delete({
      where: { id },
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    logError("delete_project_failed", { id, error });
    return { success: false, error: "Failed to delete project" };
  }
}

export async function getProjects() {
  try {
    const projects = await prisma.project.findMany({
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
    const project = await prisma.project.findUnique({
      where: { id },
    });
    return project;
  } catch (error) {
    logError("get_project_failed", { id, error });
    return null;
  }
}
