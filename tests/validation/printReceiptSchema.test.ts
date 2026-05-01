import { describe, expect, it } from "vitest";
import { parsePrintReceiptInput } from "../../src/validation/printReceiptSchema.js";

describe("parsePrintReceiptInput", () => {
  it("accepts valid input", () => {
    const parsed = parsePrintReceiptInput({
      printerUri: "ipps://printer.local/ipp/print",
      markdown: "# Hello",
      options: { copies: 2, timeoutMs: 5000 }
    });

    expect(parsed.printerUri).toBe("ipps://printer.local/ipp/print");
    expect(parsed.markdown).toBe("# Hello");
  });

  it("rejects empty markdown", () => {
    expect(() =>
      parsePrintReceiptInput({ printerUri: "ipps://printer.local/ipp/print", markdown: "" })
    ).toThrow(/markdown/i);
  });

  it("rejects invalid copies", () => {
    expect(() =>
      parsePrintReceiptInput({
        printerUri: "ipps://printer.local/ipp/print",
        markdown: "ok",
        options: { copies: 0 }
      })
    ).toThrow(/copies/i);
  });
});
