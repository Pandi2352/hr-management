// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'uploads/**', 'eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // NestJS relies on decorator metadata and dynamic Mongoose documents;
      // `any` at those boundaries is deliberate, not an oversight.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // A swallowed audit-write failure must never take down the request that
      // triggered it, so empty catch blocks are an intentional pattern here —
      // but they have to be commented, which `allowEmptyCatch` does not check.
      // Keep the rule on and use `void err` where the intent is truly "ignore".
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // The Redis driver is an implementation detail of common/cache. Keeping
      // it there is what makes the client swappable and the cache removable;
      // one direct import elsewhere quietly ends that.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'redis',
              message:
                'Import CacheService from common/cache instead. Only common/cache/cache/RedisCacheHelper.ts may touch the driver.',
            },
          ],
        },
      ],
    },
  },
  {
    // The whole cache directory may touch the driver — redis.provider.ts
    // constructs it, cache.service.ts needs its type. Nothing outside may.
    files: ['src/common/cache/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Seed scripts are CLI entrypoints — their console output is the interface.
    files: ['src/seed/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['test/**/*.ts', 'src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
);
