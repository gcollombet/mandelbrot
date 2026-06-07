import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** localStorage key used by MandelbrotViewer to persist parameters. */
const LS_KEY = "mandelbrot_last_settings";

/** Read the persisted Mandelbrot params from localStorage. */
async function getStoredParams(page: Page) {
  const raw = await page.evaluate(
    (key) => localStorage.getItem(key),
    LS_KEY,
  );
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

/** Clear persisted state so each test starts from default parameters. */
async function clearStoredParams(page: Page) {
  await page.evaluate((key) => localStorage.removeItem(key), LS_KEY);
}

/**
 * Wait until the main canvas has non-zero dimensions and is attached to the
 * DOM.  Times out via Playwright's expect timeout if WebGPU isn't available.
 */
async function waitForCanvas(page: Page) {
  const canvas = page.locator("#fullscreen canvas").first();
  await expect(canvas).toBeVisible();
  // Canvas should have real dimensions once the engine has sized it.
  const width = await canvas.evaluate(el => (el as HTMLCanvasElement).width);
  expect(width).toBeGreaterThan(0);
  return canvas;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Mandelbrot navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Start from a clean state every time.
    await page.goto("/");
    await clearStoredParams(page);
    await page.reload();
    // Wait for the app and WebGPU canvas to be ready.
    await waitForCanvas(page);
    // Give the render loop a moment to produce the first frame.
    await page.waitForTimeout(1500);
  });

  // -----------------------------------------------------------------------
  // 1. Basic loading
  // -----------------------------------------------------------------------

  test("page loads and canvas is visible", async ({ page }) => {
    const canvas = page.locator("#fullscreen canvas").first();
    await expect(canvas).toBeVisible();

    // Canvas should have non-zero rendered dimensions.
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // 2. Top settings bar
  // -----------------------------------------------------------------------

  test("top settings bar is visible with 4 tabs", async ({ page }) => {
    const bar = page.locator(".top-settings-bar");
    await expect(bar).toBeVisible();

    const buttons = page.locator(".top-tab-btn:not(.camera-btn)");
    await expect(buttons).toHaveCount(4);

    // Verify tab labels
    const labels = await buttons.allTextContents();
    const normalized = labels.map((l) => l.replace(/\s*\(.\)\s*/, "").trim());
    expect(normalized).toEqual(
      expect.arrayContaining([
        "Navigation",
        "Presets",
        "Palettes",
        "Graphics",
      ]),
    );
  });

  // -----------------------------------------------------------------------
  // 3. Clicking tab buttons opens/closes settings
  // -----------------------------------------------------------------------

  test("clicking a tab button toggles the settings popup", async ({
    page,
  }) => {
    const navBtn = page.locator(".top-tab-btn", { hasText: "Navigation" });

    // Initially no popup is open.
    await expect(page.locator(".settings-popup")).toHaveCount(0);

    // Open the Navigation popup.
    await navBtn.click();
    await expect(navBtn).toHaveClass(/is-active/);
    const popup = page.locator(".settings-popup");
    await expect(popup).toHaveCount(1);
    await expect(popup).toBeVisible();

    // Close by clicking the same tab button again.
    await navBtn.click();
    await expect(navBtn).not.toHaveClass(/is-active/);
    await expect(page.locator(".settings-popup")).toHaveCount(0);
  });

  // -----------------------------------------------------------------------
  // 4. Escape closes settings
  // -----------------------------------------------------------------------

  test("Escape key closes open settings panels", async ({ page }) => {
    // Open a panel first.
    await page.locator(".top-tab-btn", { hasText: "Presets" }).click();
    await expect(page.locator(".settings-popup")).toHaveCount(1);

    await page.keyboard.press("Escape");
    await expect(page.locator(".settings-popup")).toHaveCount(0);
  });

  // -----------------------------------------------------------------------
  // 5. Keyboard shortcuts open settings panels
  // -----------------------------------------------------------------------

  test("keyboard shortcuts toggle settings panels", async ({ page }) => {
    // 'x' opens Presets on any keyboard layout.
    await page.keyboard.press("x");
    await expect(
      page.locator(".top-tab-btn", { hasText: "Presets" }),
    ).toHaveClass(/is-active/);
    await expect(page.locator(".settings-popup")).toHaveCount(1);

    // 'c' opens Palettes too (multi-window).
    await page.keyboard.press("c");
    await expect(page.locator(".settings-popup")).toHaveCount(2);

    // 'x' again closes Presets.
    await page.keyboard.press("x");
    await expect(page.locator(".settings-popup")).toHaveCount(1);
  });

  // -----------------------------------------------------------------------
  // 6. Mouse wheel zoom changes scale
  // -----------------------------------------------------------------------

  test("mouse wheel zoom changes the scale parameter", async ({ page }) => {
    const paramsBefore = await getStoredParams(page);
    const scaleBefore = parseFloat(paramsBefore?.scale as string);

    const canvas = page.locator("#fullscreen canvas").first();
    const box = (await canvas.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Zoom in (deltaY < 0).
    await page.mouse.move(cx, cy);
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, -100);
    }

    // Give the render loop time to process the zoom.
    await page.waitForTimeout(1000);

    const paramsAfter = await getStoredParams(page);
    const scaleAfter = parseFloat(paramsAfter?.scale as string);

    // Scale should have decreased (zoomed in).
    expect(scaleAfter).toBeLessThan(scaleBefore);
  });

  // -----------------------------------------------------------------------
  // 7. Mouse drag pans the view
  // -----------------------------------------------------------------------

  test("mouse drag pans the view (cx/cy change)", async ({ page }) => {
    const paramsBefore = await getStoredParams(page);
    const cxBefore = paramsBefore?.cx as string;
    const cyBefore = paramsBefore?.cy as string;

    const canvas = page.locator("#fullscreen canvas").first();
    const box = (await canvas.boundingBox())!;
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // Drag 150px to the right and 100px down.
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 150, startY + 100, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(1000);

    const paramsAfter = await getStoredParams(page);
    const cxAfter = paramsAfter?.cx as string;
    const cyAfter = paramsAfter?.cy as string;

    // At least one coordinate should have changed.
    const changed = cxAfter !== cxBefore || cyAfter !== cyBefore;
    expect(changed).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 8. Double-click centers on a point
  // -----------------------------------------------------------------------

  test("double-click centers on the clicked point", async ({ page }) => {
    const paramsBefore = await getStoredParams(page);
    const cxBefore = paramsBefore?.cx as string;
    const cyBefore = paramsBefore?.cy as string;

    const canvas = page.locator("#fullscreen canvas").first();
    const box = (await canvas.boundingBox())!;

    // Double-click at the top-left quadrant of the canvas.
    const clickX = box.x + box.width * 0.25;
    const clickY = box.y + box.height * 0.25;
    await page.mouse.dblclick(clickX, clickY);

    await page.waitForTimeout(1000);

    const paramsAfter = await getStoredParams(page);
    const cxAfter = paramsAfter?.cx as string;
    const cyAfter = paramsAfter?.cy as string;

    // Center should have shifted.
    const changed = cxAfter !== cxBefore || cyAfter !== cyBefore;
    expect(changed).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 9. Keyboard navigation (WASD) moves the view
  // -----------------------------------------------------------------------

  test("keyboard WASD moves the view", async ({ page }) => {
    const paramsBefore = await getStoredParams(page);
    const cxBefore = paramsBefore?.cx as string;

    // Hold 'D' (move right) for several frames.
    await page.keyboard.down("d");
    await page.waitForTimeout(500);
    await page.keyboard.up("d");

    await page.waitForTimeout(500);

    const paramsAfter = await getStoredParams(page);
    const cxAfter = paramsAfter?.cx as string;

    // cx should have changed (moved right in complex plane).
    expect(cxAfter).not.toBe(cxBefore);
  });

  // -----------------------------------------------------------------------
  // 10. Render stats indicator
  // -----------------------------------------------------------------------

  test("render stats indicator is visible", async ({ page }) => {
    const stats = page.locator(".render-stats");
    await expect(stats).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // 11. localStorage persistence
  // -----------------------------------------------------------------------

  test("state is persisted to localStorage and restored on reload", async ({
    page,
  }) => {
    // Zoom in to change state.
    const canvas = page.locator("#fullscreen canvas").first();
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, -100);
    }
    await page.waitForTimeout(1000);

    const paramsBeforeReload = await getStoredParams(page);
    expect(paramsBeforeReload).not.toBeNull();
    const scaleBeforeReload = paramsBeforeReload?.scale as string;
    expect(paramsBeforeReload?.zoomMinBrushStep).toBe(1);
    expect(paramsBeforeReload?.sentinelSeedStep).toBe(64);

    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const params = JSON.parse(raw) as Record<string, unknown>;
      params.zoomMinBrushStep = 8;
      params.sentinelSeedStep = 512;
      localStorage.setItem(key, JSON.stringify(params));
    }, LS_KEY);

    // Reload the page — state should be restored from localStorage.
    await page.reload();
    await waitForCanvas(page);
    await page.waitForTimeout(1500);

    const paramsAfterReload = await getStoredParams(page);
    expect(paramsAfterReload?.scale).toBe(scaleBeforeReload);
    expect(paramsAfterReload?.zoomMinBrushStep).toBe(8);
    expect(paramsAfterReload?.sentinelSeedStep).toBe(512);
  });

  // -----------------------------------------------------------------------
  // 12. Multiple settings popups (multi-window)
  // -----------------------------------------------------------------------

  test("multiple settings popups can be open simultaneously", async ({
    page,
  }) => {
    await page.locator(".top-tab-btn", { hasText: "Navigation" }).click();
    await page.locator(".top-tab-btn", { hasText: "Palettes" }).click();

    const popups = page.locator(".settings-popup");
    await expect(popups).toHaveCount(2);

    // Close one via the X button.
    const closeBtn = popups.first().locator(".delete");
    await closeBtn.click({ force: true });
    await expect(page.locator(".settings-popup")).toHaveCount(1);
  });

  // -----------------------------------------------------------------------
  // 13. Keyboard zoom (R/F keys)
  // -----------------------------------------------------------------------

  test("R key zooms in, F key zooms out", async ({ page }) => {
    const paramsBefore = await getStoredParams(page);
    const scaleBefore = parseFloat(paramsBefore?.scale as string);

    // Zoom in with R.
    await page.keyboard.down("r");
    await page.waitForTimeout(500);
    await page.keyboard.up("r");
    await page.waitForTimeout(500);

    const paramsAfterZoomIn = await getStoredParams(page);
    const scaleAfterZoomIn = parseFloat(paramsAfterZoomIn?.scale as string);
    expect(scaleAfterZoomIn).toBeLessThan(scaleBefore);

    // Zoom out with F.
    await page.keyboard.down("f");
    await page.waitForTimeout(500);
    await page.keyboard.up("f");
    await page.waitForTimeout(500);

    const paramsAfterZoomOut = await getStoredParams(page);
    const scaleAfterZoomOut = parseFloat(paramsAfterZoomOut?.scale as string);
    expect(scaleAfterZoomOut).toBeGreaterThan(scaleAfterZoomIn);
  });
});
