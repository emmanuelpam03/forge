import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import type { TaskCreateInput, TaskStatus } from "@/types/tasks";
import { getServerSessionFromRequest } from "@/lib/server-auth";

function mapTaskType(type: TaskCreateInput["type"]) {
  return type === "one-time" ? "one_time" : type;
}

export async function createTask(input: TaskCreateInput) {
  const session = await getServerSessionFromRequest(undefined);
  const userId = session?.user?.id ?? null;
  if (!userId) throw new Error("Unauthorized");

  // verify project ownership
  const project = await prisma.project.findUnique({ where: { id: input.projectId }, select: { userId: true } });
  if (!project || project.userId !== userId) throw new Error("Not found");

  return prisma.task.create({
    data: {
      projectId: input.projectId,
      chatId: input.chatId ?? null,
      sourceMessageId: input.sourceMessageId ?? null,
      type: mapTaskType(input.type),
      status: input.status ?? "approved",
      action: input.action,
      description: input.description,
      scheduleSpec: input.scheduleSpec ?? null,
      conditionText: input.conditionText ?? null,
      oneTimeAt: input.oneTimeAt ? new Date(input.oneTimeAt) : null,
      approvedAt: input.status === "approved" ? new Date() : null,
    },
  });
}

export async function listTasksByProject(projectId: string) {
  const session = await getServerSessionFromRequest(undefined);
  const userId = session?.user?.id ?? null;
  if (!userId) return [];

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
  if (!project || project.userId !== userId) return [];

  return prisma.task.findMany({
    where: { projectId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getTaskById(taskId: string) {
  const session = await getServerSessionFromRequest(undefined);
  const userId = session?.user?.id ?? null;
  if (!userId) return null;

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return null;

  const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { userId: true } });
  if (!project || project.userId !== userId) return null;

  return task;
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const updateData: Prisma.TaskUpdateInput = {
    status,
    ...(status === "approved" ? { approvedAt: new Date() } : {}),
    ...(status === "canceled" ? { canceledAt: new Date() } : {}),
    ...(status === "completed" ? { executedAt: new Date() } : {}),
  };

  const session = await getServerSessionFromRequest(undefined);
  const userId = session?.user?.id ?? null;
  if (!userId) throw new Error("Unauthorized");

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Not found");

  const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { userId: true } });
  if (!project || project.userId !== userId) throw new Error("Not found");

  return prisma.task.update({ where: { id: taskId }, data: updateData });
}

export async function updateTask(taskId: string, data: Prisma.TaskUpdateInput) {
  const session = await getServerSessionFromRequest(undefined);
  const userId = session?.user?.id ?? null;
  if (!userId) throw new Error("Unauthorized");

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Not found");

  const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { userId: true } });
  if (!project || project.userId !== userId) throw new Error("Not found");

  return prisma.task.update({ where: { id: taskId }, data });
}

export async function deleteTask(taskId: string) {
  const session = await getServerSessionFromRequest(undefined);
  const userId = session?.user?.id ?? null;
  if (!userId) throw new Error("Unauthorized");

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Not found");

  const project = await prisma.project.findUnique({ where: { id: task.projectId }, select: { userId: true } });
  if (!project || project.userId !== userId) throw new Error("Not found");

  return prisma.task.delete({ where: { id: taskId } });
}
