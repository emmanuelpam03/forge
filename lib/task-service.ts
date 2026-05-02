import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import type { TaskCreateInput, TaskStatus } from "@/types/tasks";

function mapTaskType(type: TaskCreateInput["type"]) {
  return type === "one-time" ? "one_time" : type;
}

export async function createTask(input: TaskCreateInput) {
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
  return prisma.task.findMany({
    where: { projectId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getTaskById(taskId: string) {
  return prisma.task.findUnique({ where: { id: taskId } });
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const updateData: Prisma.TaskUpdateInput = {
    status,
    ...(status === "approved" ? { approvedAt: new Date() } : {}),
    ...(status === "canceled" ? { canceledAt: new Date() } : {}),
    ...(status === "completed" ? { executedAt: new Date() } : {}),
  };

  return prisma.task.update({
    where: { id: taskId },
    data: updateData,
  });
}

export async function updateTask(taskId: string, data: Prisma.TaskUpdateInput) {
  return prisma.task.update({
    where: { id: taskId },
    data,
  });
}

export async function deleteTask(taskId: string) {
  return prisma.task.delete({ where: { id: taskId } });
}
