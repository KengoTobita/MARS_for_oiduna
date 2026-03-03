/**
 * Error Handler Middleware
 */

import type { Context } from 'hono';

export async function errorHandler(c: Context, next: () => Promise<void>) {
  try {
    await next();
  } catch (error) {
    console.error('Error:', error);
    return c.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
