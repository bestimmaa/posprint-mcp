import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AppError } from "./errors.js";
import { handlePrintReceipt } from "./tools/printReceipt.js";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "posprint-mcp",
    version: "0.1.0"
  });

  server.tool(
    "print",
    "Print markdown content to a POS printer via CUPS URI. Use this when the user asks to print, print a receipt, make a hard copy, or print something out. Call with mode=preview first, then call again with mode=confirm and confirmationToken.",
    {
      printerUri: z.string(),
      markdown: z.string(),
      mode: z.enum(["preview", "confirm"]),
      confirmationToken: z.string().optional(),
      options: z
        .object({
          copies: z.number().int().positive().optional(),
          timeoutMs: z.number().int().positive().optional()
        })
        .optional()
    },
    async (args) => {
      try {
        const result = await handlePrintReceipt(args);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result)
            }
          ]
        };
      } catch (error) {
        if (error instanceof AppError) {
          throw new Error(
            JSON.stringify({
              code: error.code,
              message: error.message,
              meta: error.meta
            })
          );
        }

        throw error;
      }
    }
  );

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
