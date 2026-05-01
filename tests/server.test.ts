import { describe, expect, it, vi } from "vitest";

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => {
  return {
    McpServer: vi.fn().mockImplementation(() => ({
      tool: vi.fn(),
      connect: vi.fn()
    }))
  };
});

import { createServer } from "../src/server.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("createServer", () => {
  it("registers printReceipt tool", () => {
    const server = createServer();
    expect(server).toBeTruthy();

    const instance = vi.mocked(McpServer).mock.results[0]?.value;
    expect(instance.tool).toHaveBeenCalledWith(
      "printReceipt",
      expect.any(Object),
      expect.any(Function)
    );
  });
});
