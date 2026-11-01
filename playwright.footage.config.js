// Records demo footage: one 1440×900 clip per scene into footage/.
export default {
  testDir: "./tests/e2e",
  testMatch: /footage\.spec\.js/,
  timeout: 600000,
  retries: 0,
  workers: 1,
  outputDir: "./footage",
  use: {
    baseURL: process.env.E2E_BASE || "http://localhost:5173",
    viewport: { width: 1440, height: 900 },
    video: { mode: "on", size: { width: 1440, height: 900 } },
    screenshot: "off",
  },
};
