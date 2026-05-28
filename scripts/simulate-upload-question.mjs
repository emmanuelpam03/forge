// Simple ESM simulation of the tool-router fallback invoking a read_any_file tool
async function main() {
  const state = {
    chatId: "chat-sim",
    userMessage: "What's in the document?",
    attachments: [
      {
        id: "att-1",
        chatId: "chat-sim",
        name: "report.pdf",
        originalName: "report.pdf",
        mimeType: "application/pdf",
        sizeBytes: 12345,
        storageUrl: "https://example.com/report.pdf",
        status: "ready",
        kind: "pdf",
        extractedText: "",
        summary: "",
        uploadedAt: new Date().toISOString(),
      },
    ],
    messageAttachmentIds: ["att-1"],
  };

  function hasAnyActiveAttachment(state) {
    return (state.attachments ?? []).some((attachment) => attachment.status !== "failed");
  }

  function shouldPreferAttachmentExtractionIntent(state) {
    if (!hasAnyActiveAttachment(state)) return false;

    const message = (state.userMessage ?? "").toLowerCase();

    const extractionPattern = /\b(extract|read|text|summari[sz]e|analy[sz]e|review|what(?:'s| is)\s+in|content)\b/i;
    const codingPattern = /\b(code|typescript|javascript|python|java|c\+\+|c#|api|endpoint|function|class|compile|stack trace|debug|refactor)\b/i;

    const fileHintPattern = /\b(file|attachment|document|pdf|docx|csv|spreadsheet|sheet)\b/i;
    const questionWordPattern = /\b(what|who|when|where|how|why|does|do|is|are|list|show|summarize|summarise|describe|tell me|contents?)\b/i;

    if ((state.messageAttachmentIds ?? []).length > 0 && questionWordPattern.test(message)) {
      return !codingPattern.test(message);
    }

    if (extractionPattern.test(message)) {
      return !codingPattern.test(message);
    }

    if (fileHintPattern.test(message) && questionWordPattern.test(message)) {
      return !codingPattern.test(message);
    }

    return false;
  }

  if (shouldPreferAttachmentExtractionIntent(state)) {
    const firstAttachmentId = (state.messageAttachmentIds ?? [])[0] ?? (state.attachments ?? []).find((a) => a.status !== "failed")?.id;
    console.log("Heuristic triggered; would invoke read_any_file for:", firstAttachmentId);

    // Mock read_any_file tool
    const readTool = {
      invoke: async ({ attachmentId }) => {
        // Simulate parsed content
        return `Extracted text for ${attachmentId}: This is the mocked content of the uploaded PDF.`;
      },
    };

    const rawResult = await readTool.invoke({ attachmentId: firstAttachmentId });
    console.log("Mock read_any_file result:", rawResult);
  } else {
    console.log("Heuristic did not trigger; no read_any_file invocation.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
