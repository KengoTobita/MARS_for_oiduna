/**
 * Monaco Hover Provider
 */

declare const monaco: any;

export function registerHoverProvider() {
  monaco.languages.registerHoverProvider('mars', {
    provideHover: (model: any, position: any) => {
      // TODO: Provide hover information
      // 1. Get word at position
      // 2. Look up documentation
      // 3. Return hover contents

      return null;
    },
  });
}
