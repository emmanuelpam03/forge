import prisma from "@/lib/prisma";

export async function processDueTasks(projectId?: string) {
  const now = new Date();

  const dueTasks = await prisma.task.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      status: "approved",
      type: "one_time",
      oneTimeAt: {
        lte: now,
      },
    },
    orderBy: { oneTimeAt: "asc" },
  });

  const processed = [] as Array<{ taskId: string; status: string }>;

  for (const task of dueTasks) {
    const running = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: "running",
      },
    });

    // Placeholder execution hook. The actual side effect runner should be
    // attached here once task handlers are registered.
    const completed = await prisma.task.update({
      where: { id: running.id },
      data: {
        status: "completed",
        executedAt: now,
      },
    });

    processed.push({ taskId: completed.id, status: completed.status });
  }

  return {
    scanned: dueTasks.length,
    processed,
  };
}
