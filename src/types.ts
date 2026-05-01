export type PrintErrorCode =
  | "VALIDATION_ERROR"
  | "PRINTER_ERROR"
  | "TIMEOUT"
  | "UNKNOWN_ERROR";

export interface PrintReceiptInput {
  printerUri: string;
  markdown: string;
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
