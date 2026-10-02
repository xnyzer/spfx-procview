const spfxProfile = require('@microsoft/eslint-config-spfx/lib/flat-profiles/default');

module.exports = [
  // Build and test outputs of the Heft rig are generated, never linted
  {
    ignores: [
      'lib/**',
      'lib-*/**',
      'dist/**',
      'temp/**',
      'release/**',
      'sharepoint/**',
      'jest-output/**',
      'coverage/**',
      '.heft/**'
    ]
  },
  ...spfxProfile,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: './tsconfig.json'
      }
    }
  },
  {
    // Dependency-free Node scripts — the SPFx profile covers TypeScript only, so core rules here
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { Buffer: 'readonly', console: 'readonly', process: 'readonly' }
    },
    rules: {
      eqeqeq: 'error',
      'no-undef': 'error',
      'no-unused-vars': 'error',
      'no-var': 'error',
      'prefer-const': 'error'
    }
  }
];
