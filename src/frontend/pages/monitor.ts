/**
 * Monitor Page - Status dashboard
 */

import { sseClient } from '../lib/sse';

export function initMonitorPage() {
  const app = document.getElementById('app')!;

  app.innerHTML = `
    <div class="p-8">
      <h1 class="text-3xl font-bold mb-4">Monitor</h1>
      <p class="text-gray-400">Real-time playback status</p>

      <!-- Status display -->
      <div class="mt-8 bg-gray-800 p-6 rounded">
        <h2 class="text-xl font-bold mb-4">Playback Status</h2>
        <div id="status-display" class="space-y-2">
          <div>State: <span id="state-display">stopped</span></div>
          <div>Step: <span id="step-display">0</span></div>
          <div>BPM: <span id="bpm-display">120</span></div>
        </div>
      </div>

      <!-- Step grid visualization -->
      <div class="mt-8 bg-gray-800 p-6 rounded">
        <h2 class="text-xl font-bold mb-4">Step Grid</h2>
        <div id="step-grid" class="grid grid-cols-16 gap-1">
          <!-- Step indicators will be populated here -->
        </div>
      </div>
    </div>
  `;

  // TODO: Setup SSE listeners
  console.log('Monitor page initialized');
}
