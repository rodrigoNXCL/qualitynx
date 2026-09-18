const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');

module.exports = defineConfig([
  ...tseslint.configs.recommended,
  {
    ignores: ['dist', 'node_modules'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]);