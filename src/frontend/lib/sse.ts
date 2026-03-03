/**
 * SSE Client
 *
 * Server-Sent Events client for Oiduna real-time updates
 */

import { CONFIG } from './config';

export class SSEClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  connect(url: string = CONFIG.OIDUNA_SSE_URL) {
    if (this.eventSource) {
      this.disconnect();
    }

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      console.log('SSE connected');
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setTimeout(() => this.connect(url), CONFIG.SSE_RECONNECT_MS);
    };

    // Listen for all registered event types
    for (const eventType of this.listeners.keys()) {
      this.eventSource.addEventListener(eventType, (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        this.emit(eventType, data);
      });
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  on(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  off(eventType: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(eventType: string, data: any) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      for (const callback of listeners) {
        callback(data);
      }
    }
  }
}

export const sseClient = new SSEClient();
