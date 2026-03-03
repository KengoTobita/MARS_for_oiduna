/**
 * Oiduna API Proxy Routes
 *
 * Transparent proxy to Oiduna HTTP API
 */

import { Hono } from 'hono';
import { config } from '../config';

const app = new Hono();

// Proxy all requests to Oiduna
app.all('/*', async (c) => {
  const path = c.req.path.replace('/api/oiduna', '');
  const url = `${config.oiduna.apiUrl}${path}`;

  try {
    const response = await fetch(url, {
      method: c.req.method,
      headers: c.req.header(),
      body: c.req.method !== 'GET' ? await c.req.text() : undefined,
    });

    const data = await response.json();
    return c.json(data, response.status);
  } catch (error) {
    return c.json(
      { error: 'Failed to connect to Oiduna', details: String(error) },
      503
    );
  }
});

export default app;
