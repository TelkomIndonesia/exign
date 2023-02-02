/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!cacheable-lookup)'
  ]
}
