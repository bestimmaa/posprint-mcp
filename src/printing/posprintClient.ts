import posprint from "@bestimmaa/posprint";

const { markdownToEscpos, printRawToPrinterUri } = posprint as unknown as {
  markdownToEscpos: (markdown: string, options?: { charsPerLine?: number }) => Uint8Array | Buffer | number[];
  printRawToPrinterUri: (printerUri: string, data: Buffer) => Promise<unknown>;
};

export interface PrintMarkdownParams {
  printerUri: string;
  markdown: string;
  copies?: number;
  timeoutMs?: number;
  charsPerLine?: number;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`print timeout after ${timeoutMs}ms`)), timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function printMarkdown(params: PrintMarkdownParams): Promise<{ jobId?: string }> {
  const { printerUri, markdown, copies = 1, timeoutMs = 15_000, charsPerLine = 42 } = params;

  const escpos = markdownToEscpos(markdown, { charsPerLine });
  const payload = Buffer.from(escpos);

  for (let i = 0; i < copies; i += 1) {
    await withTimeout(printRawToPrinterUri(printerUri, payload), timeoutMs);
  }

  return {};
}
