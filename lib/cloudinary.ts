import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

let isConfigured = false;

function ensureConfigured() {
  if (isConfigured) {
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables are required.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  isConfigured = true;
}

export async function uploadAttachmentToCloudinary(input: {
  chatId: string;
  attachmentId: string;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}): Promise<UploadApiResponse> {
  ensureConfigured();

  const folder = `forge/uploads/${input.chatId}`;

  return await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: input.attachmentId,
        resource_type: "auto",
        use_filename: true,
        unique_filename: false,
        overwrite: true,
        filename_override: input.fileName,
        tags: ["forge", "attachment", input.chatId],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }

        resolve(result);
      },
    );

    stream.end(input.buffer);
  });
}
