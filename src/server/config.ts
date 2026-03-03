/**
 * Server Configuration
 */

export const config = {
  server: {
    port: Number(process.env.SERVER_PORT) || 8000,
    host: process.env.SERVER_HOST || 'localhost',
  },
  oiduna: {
    apiUrl: process.env.OIDUNA_API_URL || 'http://localhost:8080',
    sseUrl: process.env.OIDUNA_SSE_URL || 'http://localhost:8080/stream',
  },
  project: {
    defaultPath: process.env.DEFAULT_PROJECT_PATH || './examples/basic_techno',
  },
};
