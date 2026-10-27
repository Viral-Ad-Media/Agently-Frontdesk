// Playwright journey tests. Expects the dev server at http://localhost:5173 (or E2E_BASE).
export default {
  testDir: "./tests/e2e",
  timeout: 90000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE || "http://localhost:5173",
    viewport: { width: 1280, height: 800 },
    screenshot: "only-on-failure",
  },
};
