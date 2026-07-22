// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      '.expo-test-dist/*',
      'src/components/animated-icon.tsx',
      'src/components/animated-icon.web.tsx',
      'src/components/app-tabs.tsx',
      'src/components/app-tabs.web.tsx',
      'src/components/ui/collapsible.tsx',
      'src/hooks/use-theme.ts',
    ],
  },
]);
