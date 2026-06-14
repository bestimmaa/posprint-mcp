declare module "@bestimmaa/posprint" {
  export function markdownToEscpos(
    markdown: string,
    options?: { charsPerLine?: number }
  ): Uint8Array | Buffer | number[];

  export function printRawToPrinterUri(printerUri: string, data: Buffer, options?: { timeoutMs?: number }): Promise<unknown>;

  const api: {
    markdownToEscpos: typeof markdownToEscpos;
    printRawToPrinterUri: typeof printRawToPrinterUri;
  };

  export default api;
}
