import { describe, expect, it } from "vitest";
import { extractBearerToken, isAuthenticatedRequest, isValidBearerToken } from "../../src/http/auth.js";

describe("extractBearerToken", () => {
  it("extracts the token from a Bearer header", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123");
  });

  it("is case-insensitive on the scheme", () => {
    expect(extractBearerToken("bearer abc123")).toBe("abc123");
  });

  it("returns undefined when the header is missing", () => {
    expect(extractBearerToken(undefined)).toBeUndefined();
  });

  it("returns undefined for a non-Bearer scheme", () => {
    expect(extractBearerToken("Basic dXNlcjpwYXNz")).toBeUndefined();
  });

  it("takes the first value when the header is an array", () => {
    expect(extractBearerToken(["Bearer first", "Bearer second"])).toBe("first");
  });
});

describe("isValidBearerToken", () => {
  it("accepts a matching token", () => {
    expect(isValidBearerToken("secret", "secret")).toBe(true);
  });

  it("rejects a non-matching token", () => {
    expect(isValidBearerToken("wrong", "secret")).toBe(false);
  });

  it("rejects an undefined candidate", () => {
    expect(isValidBearerToken(undefined, "secret")).toBe(false);
  });

  it("rejects a token with a different length", () => {
    expect(isValidBearerToken("short", "much-longer-secret")).toBe(false);
  });
});

describe("isAuthenticatedRequest", () => {
  function fakeRequest(authorization?: string) {
    return { headers: { authorization } } as import("node:http").IncomingMessage;
  }

  it("returns true for a valid bearer header", () => {
    expect(isAuthenticatedRequest(fakeRequest("Bearer secret"), "secret")).toBe(true);
  });

  it("returns false for a missing header", () => {
    expect(isAuthenticatedRequest(fakeRequest(undefined), "secret")).toBe(false);
  });

  it("returns false for an invalid token", () => {
    expect(isAuthenticatedRequest(fakeRequest("Bearer nope"), "secret")).toBe(false);
  });
});
