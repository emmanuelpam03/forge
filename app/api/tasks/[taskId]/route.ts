import { NextRequest } from "next/server";
import { z } from "zod";
import { deleteTask, getTaskById, updateTask } from "@/lib/task-service";

export const runtime = "nodejs";

const updateTaskSchema = z.object({
  action: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  scheduleSpec: z.string().min(1).nullable().optional(),
  conditionText: z.string().min(1).nullable().optional(),
  oneTimeAt: z.string().datetime().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  const task = await getTaskById(taskId);

  if (!task) {
    return Response.json({ error: "Task not found." }, { status: 404 });
  }

  return Response.json({ task });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  const body = await request.json();
  const parsed = updateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid task payload." }, { status: 400 });
  }

  const task = await updateTask(taskId, {
    ...parsed.data,
    oneTimeAt: parsed.data.oneTimeAt
      ? new Date(parsed.data.oneTimeAt)
      : parsed.data.oneTimeAt === null
        ? null
        : undefined,
  });

  return Response.json({ task });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  await deleteTask(taskId);
  return Response.json({ success: true });
}
