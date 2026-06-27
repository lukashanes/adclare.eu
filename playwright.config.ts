import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: {
    timeout: 12_000,
  },
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      APP_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
      HOSTNAME: "127.0.0.1",
      PORT: new URL(baseURL).port || "3000",
      TURNSTILE_REQUIRED: "0",
      ADCLARE_STORAGE_DRIVER: "local",
      ADCLARE_LOCAL_STORAGE_DIR: process.env.ADCLARE_LOCAL_STORAGE_DIR || ".data/e2e-uploads",
      SIGNUP_MODE: "first-run",
      ADCLARE_LOG_EMAIL_LINKS: "0",
      NEXT_PUBLIC_SHOW_DEMO_REPO: "0",
    },
  },
});
