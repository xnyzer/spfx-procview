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
  }
];
