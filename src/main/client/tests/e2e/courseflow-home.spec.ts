import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'user',
      JSON.stringify({ id: 7, role: 'USER', email: 'student@example.edu' }),
    );
  });

  await page.route('**/api/users/friends', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/class-schedule/current', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/courses/courseIdent/**', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: '{}',
    });
  });
});

test('shows and dismisses the CourseFlow walkthrough in a real browser', async ({ page }) => {
  await page.goto('/courseflow');

  const walkthroughDialog = page.getByRole('dialog', { name: 'Welcome to CourseFlow' });

  await expect(walkthroughDialog).toBeVisible();
  await expect(walkthroughDialog.getByRole('heading', { name: 'Flowchart Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: 'Start Exploring' }).click();

  await expect(walkthroughDialog).toBeHidden();
  await expect
    .poll(async () => page.evaluate(() => window.localStorage.getItem('courseflow_home_walkthrough_seen_7')))
    .toBe('true');
});
