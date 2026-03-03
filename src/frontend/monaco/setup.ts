/**
 * Monaco Editor Setup
 */

declare const monaco: any;

export async function setupMonaco() {
  return new Promise<void>((resolve) => {
    // @ts-ignore
    require.config({
      paths: {
        vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min/vs',
      },
    });

    // @ts-ignore
    require(['vs/editor/editor.main'], () => {
      console.log('Monaco Editor loaded');
      resolve();
    });
  });
}

export function createEditor(container: HTMLElement, value: string = '') {
  return monaco.editor.create(container, {
    value,
    language: 'mars',
    theme: 'mars-dark',
    automaticLayout: true,
    fontSize: 14,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
  });
}
