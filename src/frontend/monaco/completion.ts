/**
 * Monaco Completion Provider
 */

declare const monaco: any;

export function registerCompletionProvider() {
  monaco.languages.registerCompletionItemProvider('mars', {
    provideCompletionItems: (model: any, position: any) => {
      // TODO: Implement completion suggestions
      const suggestions = [
        {
          label: 'Environment',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'Environment {\n  \n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
        {
          label: 'Track',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'Track ${1:id} {\n  \n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        },
      ];

      return { suggestions };
    },
  });
}
