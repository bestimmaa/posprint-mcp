export type PrintErrorCode =
  | "VALIDATION_ERROR"
  | "PRINTER_ERROR"
  | "TIMEOUT"
  | "UNKNOWN_ERROR";

export type PrintMode = "preview" | "confirm";

export interface PrintReceiptInput {
  printerUri: string;
  markdown: string;
  mode: PrintMode;
  confirmationToken?: string;
  options?: {
    copies?: number;
    timeoutMs?: number;
  };
}

export interface PrintSuccessMeta {
  printerUri: string;
  durationMs: number;
  printedAt: string;
  jobId?: string;
}

export interface PrintReceiptSuccess {
  ok: true;
  meta: PrintSuccessMeta;
}

export interface PrintPreviewSuccess {
  ok: true;
  requiresConfirmation: true;
  confirmationToken: string;
  preview: {
    lineCount: number;
    snippet: string;
    suggestedAction: string;
    excessiveLengthWarning?: string;
  };
}

export type PrintToolResult = PrintReceiptSuccess | PrintPreviewSuccess;
