import { describe, expect, it } from "vitest";
import { AppError, mapUnknownError } from "../src/errors.js";

describe("mapUnknownError", () => {
  it("passes through AppError unchanged", () => {
    const err = new AppError("VALIDATION_ERROR", "bad input", { field: "markdown" });
    const mapped = mapUnknownError(err);
    expect(mapped).toBe(err);
  });

  it("maps timeout-like errors to TIMEOUT", () => {
    const mapped = mapUnknownError(new Error("operation timeout exceeded"));
    expect(mapped.code).toBe("TIMEOUT");
  });

  it("maps unknown errors to UNKNOWN_ERROR", () => {
    const mapped = mapUnknownError(new Error("boom"));
    expect(mapped.code).toBe("UNKNOWN_ERROR");
  });
});
