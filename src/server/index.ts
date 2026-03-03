/**
 * Hono Server
 *
 * Main entry point for the backend API server
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import projectRoutes from './routes/project';
import compilationRoutes from './routes/compilation';
import oidunaProxyRoutes from './routes/oiduna-proxy';

const app = new Hono();

// Middleware
app.use('/*', cors());
app.use('/*', logger());

// Routes
app.route('/api/project', projectRoutes);
app.route('/api/compile', compilationRoutes);
app.route('/api/oiduna', oidunaProxyRoutes);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const port = Number(process.env.SERVER_PORT) || 8000;
console.log(`Server running on http://localhost:${port}`);

export default app;
