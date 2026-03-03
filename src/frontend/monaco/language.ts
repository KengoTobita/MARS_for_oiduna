/**
 * MARS DSL Language Definition for Monaco
 */

declare const monaco: any;

export function registerMarsLanguage() {
  // TODO: Register MARS DSL language
  // 1. Define language ID
  // 2. Register tokenizer
  // 3. Register language configuration (brackets, comments, etc.)

  monaco.languages.register({ id: 'mars' });

  monaco.languages.setMonarchTokensProvider('mars', {
    tokenizer: {
      root: [
        // TODO: Define tokenization rules
        [/\bEnvironment\b/, 'keyword'],
        [/\bTrack\b/, 'keyword'],
        [/\bapply\b/, 'keyword'],
        [/[a-zA-Z_]\w*/, 'identifier'],
        [/\d+(\.\d+)?/, 'number'],
        [/"[^"]*"/, 'string'],
      ],
    },
  });
}
