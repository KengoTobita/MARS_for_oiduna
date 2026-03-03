/**
 * Frontend Configuration
 */

export const CONFIG = Object.freeze({
  // API
  API_BASE: '/api',

  // Oiduna
  OIDUNA_API_BASE: '/api/oiduna',
  OIDUNA_SSE_URL: '/api/oiduna/stream',

  // Loop settings
  LOOP_STEPS: 256,
  STEPS_PER_BAR: 16,

  // Defaults
  DEFAULT_BPM: 120,
  DEFAULT_GATE: 1.0,

  // SSE
  SSE_RECONNECT_MS: 3000,
});
