/**
 * Monaco Editor Theme
 */

declare const monaco: any;

export function registerMarsTheme() {
  monaco.editor.defineTheme('mars-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'C586C0' },
      { token: 'identifier', foreground: '9CDCFE' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'string', foreground: 'CE9178' },
    ],
    colors: {
      'editor.background': '#1E1E1E',
    },
  });
}
