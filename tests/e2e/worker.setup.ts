import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test } from '@playwright/test';

test('HTTP smoke checks pass against the prerendered Worker', async ({ baseURL }) => {
  await promisify(execFile)(process.execPath, ['scripts/smoke-local.mjs'], {
    env: { ...process.env, FRAME_FINISH_TEST_URL: baseURL },
  });
});
