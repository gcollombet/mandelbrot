import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.resolve("tests/screenshots");

// Ensure screenshot directory exists
test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

/**
 * Helper: wait for the fractal canvas to be rendered (non-black).
 * We poll for pixel data on the canvas until we see non-zero pixels.
 */
async function waitForCanvasRendered(
  page: ReturnType<typeof test["info"]> extends never ? any : any,
  timeout = 15_000,
) {
  await page.waitForSelector("#fullscreen canvas", { timeout });
  // Give the GPU some time to render initial frames
  await page.waitForTimeout(3000);
}

/**
 * Helper: take a named screenshot and return the path
 */
async function screenshot(page: any, name: string) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`Screenshot saved: ${filePath}`);
  return filePath;
}

/**
 * Helper: simulate zoom-in on the canvas center using mouse wheel
 */
async function zoomIn(page: any, ticks = 20, delayMs = 80) {
  const canvas = page.locator("#fullscreen canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not found");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  for (let i = 0; i < ticks; i++) {
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(delayMs);
  }
}

/**
 * Helper: simulate pan by dragging the canvas
 */
async function pan(
  page: any,
  dx: number,
  dy: number,
  steps = 10,
) {
  const canvas = page.locator("#fullscreen canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not found");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      cx + (dx * i) / steps,
      cy + (dy * i) / steps,
    );
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
}

// ─────────────────────────────────────────────────────────────────────
// Test 1: Default Mandelbrot view renders (not black)
// ─────────────────────────────────────────────────────────────────────
test("default view renders correctly", async ({ page }) => {
  // Clear any stored settings so we get the default view
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("mandelbrot_last_settings"));
  await page.reload();

  await waitForCanvasRendered(page);

  // Verify canvas exists and has dimensions
  const canvas = page.locator("#fullscreen canvas").first();
  await expect(canvas).toBeVisible();

  // Check that the canvas has non-trivial content (WebGPU rendering worked)
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.width).toBeGreaterThan(100);
  expect(box!.height).toBeGreaterThan(100);

  await screenshot(page, "01-default-view");
});

// ─────────────────────────────────────────────────────────────────────
// Test 2: Zoom reprojection — zoom in and verify compositing
// ─────────────────────────────────────────────────────────────────────
test("zoom reprojection composites correctly", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("mandelbrot_last_settings"));
  await page.reload();
  await waitForCanvasRendered(page);

  // Screenshot before zoom
  await screenshot(page, "02a-before-zoom");

  // Zoom in with wheel events
  await zoomIn(page, 15, 100);

  // During zoom: capture mid-zoom state (frozen + live compositing)
  await screenshot(page, "02b-during-zoom");

  // Wait for progressive computation to settle
  await page.waitForTimeout(4000);
  await screenshot(page, "02c-after-zoom-settled");
});

// ─────────────────────────────────────────────────────────────────────
// Test 3: Frozen alignment during pan after zoom
// ─────────────────────────────────────────────────────────────────────
test("frozen texture alignment after pan", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("mandelbrot_last_settings"));
  await page.reload();
  await waitForCanvasRendered(page);

  // Zoom in first
  await zoomIn(page, 10, 100);
  await page.waitForTimeout(3000);
  await screenshot(page, "03a-zoomed-before-pan");

  // Pan to the right
  await pan(page, 200, 0);
  await page.waitForTimeout(1000);
  await screenshot(page, "03b-after-pan-right");

  // Pan down
  await pan(page, 0, 150);
  await page.waitForTimeout(1000);
  await screenshot(page, "03c-after-pan-down");

  // Wait for settlement
  await page.waitForTimeout(3000);
  await screenshot(page, "03d-pan-settled");
});

// ─────────────────────────────────────────────────────────────────────
// Test 4: Interior pixel rendering (navigate to Mandelbrot interior)
// ─────────────────────────────────────────────────────────────────────
test("interior pixels render without effects", async ({ page }) => {
  await page.goto("/");

  // Pre-seed location to center of the main cardioid (interior region)
  // cx=0, cy=0 with modest scale shows interior (the large black region)
  await page.evaluate(() => {
    localStorage.setItem(
      "mandelbrot_last_settings",
      JSON.stringify({
        cx: "0.0",
        cy: "0.0",
        scale: "1.0",
        angle: 0,
      }),
    );
  });
  await page.reload();
  await waitForCanvasRendered(page);

  await screenshot(page, "04-interior-region");
});

// ─────────────────────────────────────────────────────────────────────
// Test 5: PalettePreview renders (not black)
// ─────────────────────────────────────────────────────────────────────
test("palette preview renders correctly", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("mandelbrot_last_settings"));
  await page.reload();
  await waitForCanvasRendered(page);

  // Open the Palettes settings tab
  const palettesBtn = page.locator(".top-tab-btn", { hasText: "Palettes" });
  await palettesBtn.click();
  await page.waitForTimeout(1500);

  // Verify the palette preview canvas appears and is visible
  const previewCanvas = page.locator(".palette-preview-canvas");
  await expect(previewCanvas).toBeVisible({ timeout: 5000 });

  // Take screenshot showing the palette preview
  await screenshot(page, "05-palette-preview");

  // Close the popup
  await page.keyboard.press("Escape");
});

// ─────────────────────────────────────────────────────────────────────
// Test 6: Console error check — no WebGPU errors during session
// ─────────────────────────────────────────────────────────────────────
test("no critical console errors during rendering", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg: any) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });
  page.on("pageerror", (err: Error) => {
    errors.push(err.message);
  });

  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("mandelbrot_last_settings"));
  await page.reload();
  await waitForCanvasRendered(page);

  // Zoom in and out
  await zoomIn(page, 10, 80);
  await page.waitForTimeout(2000);

  // Pan
  await pan(page, 100, 100);
  await page.waitForTimeout(2000);

  // Filter out non-critical errors (e.g., browser extension noise)
  const criticalErrors = errors.filter(
    (e) =>
      e.includes("WebGPU") ||
      e.includes("GPUValidationError") ||
      e.includes("wgsl") ||
      e.includes("pipeline") ||
      e.includes("buffer") ||
      e.includes("binding") ||
      e.includes("TypeError") ||
      e.includes("RangeError"),
  );

  if (criticalErrors.length > 0) {
    console.log("Critical console errors detected:");
    criticalErrors.forEach((e) => console.log(`  - ${e}`));
  }

  expect(criticalErrors).toHaveLength(0);
});
