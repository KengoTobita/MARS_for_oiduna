/**
 * DSL Compilation API Routes
 */

import { Hono } from 'hono';
import { compileDSL } from '@shared/compiler';

const app = new Hono();

// Compile DSL to Oiduna IR
app.post('/', async (c) => {
  try {
    const { dsl } = await c.req.json();

    if (!dsl) {
      return c.json({ error: 'DSL source is required' }, 400);
    }

    // TODO: Implement compilation
    const result = compileDSL(dsl);

    return c.json(result);
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Validate DSL only
app.post('/validate', async (c) => {
  try {
    const { dsl } = await c.req.json();

    if (!dsl) {
      return c.json({ error: 'DSL source is required' }, 400);
    }

    // TODO: Implement validation
    return c.json({
      valid: false,
      errors: [],
      warnings: [],
    });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

export default app;
