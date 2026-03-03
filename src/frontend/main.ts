/**
 * Frontend Application Entry Point
 */

import { router } from './router';

// Initialize router
router();

// Listen for hash changes
window.addEventListener('hashchange', router);
window.addEventListener('load', router);

console.log('MARS for Oiduna - Frontend loaded');
