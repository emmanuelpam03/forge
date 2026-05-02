import { NextRequest } from "next/server";
import { z } from "zod";
import { processDueTasks } from "@/lib/task-executor";

export const runtime = "nodejs";

const executeSchema = z.object({
  projectId: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = executeSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid execution payload." },
      { status: 400 },
    );
  }

  const result = await processDueTasks(parsed.data.projectId);
  return Response.json({ result });
}
