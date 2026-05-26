import { createCanvas } from "@napi-rs/canvas";
import { extractText } from "../lib/ocr.ts";

// Minimal smoke test to ensure the OCR adapter can read a rendered image.
async function main() {
  const canvas = createCanvas(600, 200);
  const ctx = canvas.getContext("2d");

  // White background, black text.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 600, 200);
  ctx.fillStyle = "#000000";
  ctx.font = "40px sans-serif";
  ctx.fillText("FORGE OCR TEST", 40, 90);

  const buf = canvas.toBuffer("image/png");
  const text = await extractText(buf, { scope: "document", lang: "eng" });
  console.log("OCR_TEXT_LENGTH", text.length);
  console.log("OCR_TEXT_PREVIEW", JSON.stringify(text.slice(0, 80)));
}

void main().catch((err) => {
  console.error("OCR smoke test failed:", err);
  process.exit(1);
});

