import test from "node:test";
import assert from "node:assert/strict";

const hasEnv = Boolean(
  process.env.DATABASE_URL &&
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
);

if (!hasEnv) {
  test.skip("integration: upload persists to Cloudinary and DB (env missing)", () => {});
} else {
  test("integration: upload persists to Cloudinary", async () => {
    const { uploadAttachmentToCloudinary } = await import("../lib/cloudinary.ts");
    const { randomUUID } = await import("node:crypto");

    const chatId = "test-chat";
    const buffer = Buffer.from("integration test body", "utf8");
    const attachmentId = randomUUID();

    const result = await uploadAttachmentToCloudinary({
      chatId,
      attachmentId,
      buffer,
      fileName: "integ.txt",
      mimeType: "text/plain",
    });

    assert.ok(result.secure_url && result.public_id);
  });
}
