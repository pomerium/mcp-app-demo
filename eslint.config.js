// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook'

//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  {
    ignores: [
      '.nitro/**',
      '.output/**',
      '.netlify/**',
      'storybook-static/**',
      'eslint.config.js',
      'prettier.config.js',
    ],
  },
  {
    rules: {
      // TypeScript unused variables (includes imports)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  ...tanstackConfig,
  ...storybook.configs['flat/recommended'],
]
