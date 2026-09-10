import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'src/server/db/migrations/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'vite.config.ts', 'playwright.config.ts', 'drizzle.config.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/client/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/shared/tien/**/*.ts', 'src/server/kho/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "BinaryExpression[operator='/']",
          message: 'Cấm phép chia trần cho tiền/kho — dùng hàm trong src/shared/tien/.',
        },
        {
          selector: "CallExpression[callee.name='parseFloat']",
          message: 'Cấm parseFloat cho tiền/kho.',
        },
        {
          selector: "CallExpression[callee.property.name='toFixed']",
          message: 'Cấm toFixed dùng để tính toán tiền/kho.',
        },
      ],
    },
  },
  {
    files: ['tests/**/*.ts'],
    extends: [...tseslint.configs.recommended],
  },
  eslintConfigPrettier,
);
