export type StreamEvent =
  | { type: "status"; message: string }
  | { type: "reasoning"; content: string }
  | { type: "token"; content: string }
  | {
      type: "images";
      query: string;
      provider?: string;
      images: Array<{
        id: string;
        url: string;
        thumbnailUrl: string;
        title?: string;
        sourcePage?: string;
        width?: number;
        height?: number;
        provider?: string;
        relevanceScore?: number;
        safetyScore?: number;
        metadata?: Record<string, unknown>;
      }>;
      totalFound: number;
      retrievalTimeMs: number;
    }
  | {
      type: "placeholder";
      messageId: string;
      branchId: string;
      parentId: string | null;
    }
  | {
      type: "branches";
      parentId: string | null;
      branches: Array<{
        id: string;
        content: string;
        parentId: string | null;
        branchId: string | null;
        createdAt: string;
      }>;
    }
  | {
      type: "done";
      messageId?: string;
      userMessageId?: string;
      response?: string;
      suggestions?: string[];
    };
