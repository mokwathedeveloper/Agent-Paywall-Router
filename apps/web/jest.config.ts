import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "<rootDir>/../../node_modules/ts-jest",
      { tsconfig: { jsx: "react", esModuleInterop: true } },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  testTimeout: 60000,
  clearMocks: true,
  collectCoverageFrom: [
    "lib/**/*.ts",
    "app/api/**/*.ts",
    "!lib/supabase.ts",
  ],
};

export default config;
