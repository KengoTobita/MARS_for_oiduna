/**
 * Studio Page - Composition and project building
 */

export function initStudioPage() {
  const app = document.getElementById('app')!;

  app.innerHTML = `
    <div class="p-8">
      <h1 class="text-3xl font-bold mb-4">Studio</h1>
      <p class="text-gray-400">Project composition and clip management</p>

      <!-- TODO: Implement studio UI -->
      <div class="mt-8 bg-gray-800 p-6 rounded">
        <h2 class="text-xl font-bold mb-4">Songs</h2>
        <div id="song-list" class="space-y-2">
          <!-- Song list will be populated here -->
        </div>
      </div>
    </div>
  `;

  console.log('Studio page initialized');
}
