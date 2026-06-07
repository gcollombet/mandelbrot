import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testIgnore: "unit/**",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
    video: "off",
    launchOptions: {
      args: [
        "--enable-unsafe-webgpu",
        "--enable-features=Vulkan",
        "--use-angle=default",
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        // WebGPU requires headed mode in most environments
        headless: false,
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  // Dev server is expected to already be running
  webServer: undefined,
});
