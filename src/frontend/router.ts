/**
 * Simple Hash-based Router
 */

import { initLivePage } from './pages/live';
import { initStudioPage } from './pages/studio';
import { initSetlistPage } from './pages/setlist';
import { initMonitorPage } from './pages/monitor';
import { initSettingsPage } from './pages/settings';

const routes: Record<string, () => void> = {
  '/live': initLivePage,
  '/studio': initStudioPage,
  '/setlist': initSetlistPage,
  '/monitor': initMonitorPage,
  '/settings': initSettingsPage,
};

export function router() {
  const path = window.location.hash.slice(1) || '/live';
  const handler = routes[path] || routes['/live'];

  handler();
}
