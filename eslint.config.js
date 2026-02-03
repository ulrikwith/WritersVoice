import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow explicit any for utility functions and external API interfaces
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow unused expressions for optional chaining patterns
      '@typescript-eslint/no-unused-expressions': 'warn',
      // Allow control characters in regex (needed for text processing)
      'no-control-regex': 'off',
      // Allow lexical declarations in case blocks
      'no-case-declarations': 'off',
      // Relax react-hooks rules for common patterns
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      // Allow empty patterns for unused destructured props
      'no-empty-pattern': 'warn',
    },
  },
])
