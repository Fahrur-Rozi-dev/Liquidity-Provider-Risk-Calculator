import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

/**
 * Test infrastructure for the LP Risk & Hedge Intelligence platform.
 * Unit tests live in tests/unit, integration tests in tests/integration,
 * shared fixtures in tests/fixtures (see docs/02-structure.md).
 * @type {import('jest').Config}
 */
const config = {
  testEnvironment: "jsdom",
  testMatch: ["<rootDir>/tests/**/*.test.ts?(x)"],
  moduleDirectories: ["node_modules", "<rootDir>/src"],
  clearMocks: true,
};

export default createJestConfig(config);
