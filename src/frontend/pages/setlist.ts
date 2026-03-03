/**
 * Setlist Page - Clip browser and scene management
 */

export function initSetlistPage() {
  const app = document.getElementById('app')!;

  app.innerHTML = `
    <div class="p-8">
      <h1 class="text-3xl font-bold mb-4">Setlist</h1>
      <p class="text-gray-400">Browse and apply clips</p>

      <!-- TODO: Implement setlist UI -->
      <div class="mt-8 grid grid-cols-4 gap-4">
        <!-- Clip grid will be populated here -->
      </div>
    </div>
  `;

  console.log('Setlist page initialized');
}
