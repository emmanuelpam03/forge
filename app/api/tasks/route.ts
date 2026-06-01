import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createTask,
  listTasksByProject,
  updateTaskStatus,
  getTaskById,
} from "@/lib/task-service";
import { requireServerUser } from "@/lib/server-auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const taskTypeSchema = z.enum(["scheduled", "conditional", "one-time"]);
const taskStatusSchema = z.enum([
  "pending_approval",
  "approved",
  "queued",
  "running",
  "completed",
  "canceled",
  "rejected",
  "failed",
]);

const createTaskSchema = z.object({
  projectId: z.string().min(1),
  chatId: z.string().min(1).optional(),
  sourceMessageId: z.string().min(1).optional(),
  action: z.string().min(1),
  description: z.string().min(1),
  type: taskTypeSchema,
  scheduleSpec: z.string().min(1).optional(),
  conditionText: z.string().min(1).optional(),
  oneTimeAt: z.string().datetime().optional(),
  status: taskStatusSchema.optional(),
});

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") ?? "";

  if (!projectId) {
    return Response.json({ error: "projectId is required." }, { status: 400 });
  }

  // Require authenticated user and verify project ownership
  let user: any;
  try {
    user = await requireServerUser(request as unknown as Request);
  } catch (err) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { userId: true } });
  if (!project || project.userId !== user.id) {
    return Response.json({ error: "Project not found or access denied." }, { status: 404 });
  }

  const tasks = await listTasksByProject(projectId);
  return Response.json({ tasks });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createTaskSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid task payload." }, { status: 400 });
  }

  // Require authenticated user and verify project ownership
  let user: any;
  try {
    user = await requireServerUser(request as unknown as Request);
  } catch (err) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId }, select: { userId: true } });
  if (!project || project.userId !== user.id) {
    return Response.json({ error: "Project not found or access denied." }, { status: 404 });
  }

  const task = await createTask({
    ...parsed.data,
    scheduleSpec: parsed.data.scheduleSpec ?? null,
    conditionText: parsed.data.conditionText ?? null,
    oneTimeAt: parsed.data.oneTimeAt ?? null,
    status: parsed.data.status ?? "approved",
  });

  return Response.json({ task }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const schema = z.object({
    taskId: z.string().min(1),
    status: taskStatusSchema,
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid task update payload." },
      { status: 400 },
    );
  }
  // Require authenticated user and verify ownership of the task via project
  let user: any;
  try {
    user = await requireServerUser(request as unknown as Request);
  } catch (err) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taskRecord = await getTaskById(parsed.data.taskId);
  if (!taskRecord) {
    return Response.json({ error: "Task not found." }, { status: 404 });
  }

  const project = await prisma.project.findUnique({ where: { id: taskRecord.projectId }, select: { userId: true } });
  if (!project || project.userId !== user.id) {
    return Response.json({ error: "Access denied." }, { status: 403 });
  }

  const task = await updateTaskStatus(parsed.data.taskId, parsed.data.status);
  return Response.json({ task });
}
