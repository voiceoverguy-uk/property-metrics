/// <reference types="node" />
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'flows.spec.ts', workers: 1, timeout: 60000,
  use: {
    baseURL: `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`,
    viewport: { width: 390, height: 844 },
    launchOptions: { executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] },
    trace: 'retain-on-failure',
  },
});
