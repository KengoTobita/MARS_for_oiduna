/**
 * Live Coding Page
 */

import { setupMonaco, createEditor } from '../monaco/setup';
import { registerMarsLanguage } from '../monaco/language';
import { registerMarsTheme } from '../monaco/theme';
import { registerCompletionProvider } from '../monaco/completion';
import { setupDiagnostics } from '../monaco/diagnostics';

export async function initLivePage() {
  const app = document.getElementById('app')!;

  app.innerHTML = `
    <div class="flex flex-col h-full">
      <!-- Toolbar -->
      <div class="bg-gray-800 border-b border-gray-700 p-3 flex gap-2">
        <button id="btn-play" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded">
          ▶ Play
        </button>
        <button id="btn-stop" class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded">
          ■ Stop
        </button>
        <button id="btn-compile" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
          🔄 Compile
        </button>
        <div class="flex-1"></div>
        <div class="text-sm py-2">BPM: <span id="bpm-display">120</span></div>
        <div class="text-sm py-2">Step: <span id="step-display">0</span>/256</div>
      </div>

      <!-- Editor -->
      <div id="editor-container" class="flex-1"></div>
    </div>
  `;

  // Setup Monaco
  await setupMonaco();
  registerMarsLanguage();
  registerMarsTheme();
  registerCompletionProvider();

  const container = document.getElementById('editor-container')!;
  const editor = createEditor(container, '// Write MARS DSL here\n');

  setupDiagnostics(editor);

  // TODO: Setup event handlers for buttons
  console.log('Live page initialized');
}
