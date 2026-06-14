import { describe, expect, it, vi, beforeEach } from "vitest";
import { printMarkdown } from "../../src/printing/posprintClient.js";

vi.mock("@bestimmaa/posprint", () => ({
  default: {
    markdownToEscpos: vi.fn(),
    printRawToPrinterUri: vi.fn()
  }
}));

import posprint from "@bestimmaa/posprint";

const api = posprint as unknown as {
  markdownToEscpos: ReturnType<typeof vi.fn>;
  printRawToPrinterUri: ReturnType<typeof vi.fn>;
};

describe("printMarkdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converts markdown and prints to CUPS URI", async () => {
    api.markdownToEscpos.mockReturnValueOnce(Uint8Array.from([0x1b, 0x40]));
    api.printRawToPrinterUri.mockResolvedValueOnce({ printerUri: "ipps://printer.local/ipp/print" });

    const result = await printMarkdown({
      printerUri: "ipps://printer.local/ipp/print",
      markdown: "# Receipt",
      copies: 1,
      timeoutMs: 5000
    });

    expect(api.markdownToEscpos).toHaveBeenCalledWith("# Receipt", { charsPerLine: 42 });
    expect(api.printRawToPrinterUri).toHaveBeenCalledTimes(1);
    expect(api.printRawToPrinterUri).toHaveBeenCalledWith(
      "ipps://printer.local/ipp/print",
      expect.any(Buffer),
      { timeoutMs: 5000 }
    );
    expect(result.jobId).toBeUndefined();
  });

  it("throws timeout error when URI print exceeds timeout", async () => {
    api.markdownToEscpos.mockReturnValueOnce(Uint8Array.from([0x1b, 0x40]));
    api.printRawToPrinterUri.mockRejectedValueOnce(new Error("IPP request timed out after 10ms"));

    await expect(
      printMarkdown({
        printerUri: "ipps://printer.local/ipp/print",
        markdown: "# Receipt",
        timeoutMs: 10
      })
    ).rejects.toThrow(/timed out/i);
  });

  it("forwards timeoutMs to printRawToPrinterUri", async () => {
    api.markdownToEscpos.mockReturnValueOnce(Uint8Array.from([0x1b, 0x40]));
    api.printRawToPrinterUri.mockResolvedValueOnce({});

    await printMarkdown({
      printerUri: "ipps://printer.local/ipp/print",
      markdown: "# Receipt",
      timeoutMs: 7500
    });

    expect(api.printRawToPrinterUri).toHaveBeenCalledWith(
      "ipps://printer.local/ipp/print",
      expect.any(Buffer),
      { timeoutMs: 7500 }
    );
  });
});
