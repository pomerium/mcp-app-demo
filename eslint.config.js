//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    ignores: [
      '.nitro/**',
      '.tanstack/**',
      '.output/**',
      'eslint.config.js',
      'prettier.config.js',
    ],
  },
]
