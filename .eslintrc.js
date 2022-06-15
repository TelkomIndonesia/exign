module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'standard',
    'plugin:@typescript-eslint/recommended',
    'plugin:mocha/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
  },
  overrides: [
    {
      files: ['src/**/*.spec.ts'],
      rules: {
        'no-unused-expressions': 'off'
      }
    }
  ],
  ignorePatterns: ['dist']
}
