/**
 * Settings Page - Configuration
 */

export function initSettingsPage() {
  const app = document.getElementById('app')!;

  app.innerHTML = `
    <div class="p-8">
      <h1 class="text-3xl font-bold mb-4">Settings</h1>

      <!-- Project settings -->
      <div class="mt-8 bg-gray-800 p-6 rounded">
        <h2 class="text-xl font-bold mb-4">Project</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm mb-2">Project Path</label>
            <input type="text" class="w-full bg-gray-700 px-3 py-2 rounded"
                   value="./examples/basic_techno" />
          </div>
          <button class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
            Open Project
          </button>
        </div>
      </div>

      <!-- Oiduna connection -->
      <div class="mt-8 bg-gray-800 p-6 rounded">
        <h2 class="text-xl font-bold mb-4">Oiduna Connection</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm mb-2">API URL</label>
            <input type="text" class="w-full bg-gray-700 px-3 py-2 rounded"
                   value="http://localhost:8080" />
          </div>
          <button class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded">
            Test Connection
          </button>
        </div>
      </div>
    </div>
  `;

  console.log('Settings page initialized');
}
