import { prisma } from "@/lib/db";

export async function logMakeWebhook(
  endpoint: string,
  method: string,
  requestBody: unknown,
  statusCode: number,
  responseBody?: unknown,
  error?: string
) {
  try {
    await prisma.makeWebhookLog.create({
      data: {
        endpoint,
        method,
        statusCode,
        requestBody: requestBody as object,
        responseBody: responseBody as object,
        error,
      },
    });
  } catch {
    // Don't fail request if logging fails
  }
}
