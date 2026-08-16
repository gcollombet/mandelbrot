import { expect, test, type Page } from "@playwright/test";

// Produces an actual WebM through the real capture + encode chain and inspects
// the bytes. Anything less would only prove the code does not throw.

async function bootConverged(page: Page) {
  await page.goto("/");
  await page.waitForSelector("#fullscreen canvas", { timeout: 15_000 });
  await page.waitForFunction(() => (window as any).__mandelbrotEngine, undefined, { timeout: 15_000 });
  await page.mouse.click(640, 360);
  await page.waitForTimeout(1_500);

  const deadline = Date.now() + 60_000;
  let stable = 0;
  while (stable < 4) {
    if (Date.now() > deadline) throw new Error("bootConverged: timeout");
    const idle = await page.evaluate(() => {
      const e = (window as any).__mandelbrotEngine;
      return !!e && e.unfinishedPixelCount >= 0 && e.unfinishedPixelCount <= 10 && !e.needRender;
    });
    stable = idle ? stable + 1 : 0;
    await page.waitForTimeout(250);
  }
}

for (const codec of ["av1", "avc"] as const) {
test(`encodes captured frames into a playable MP4 in ${codec}`, async ({ page }) => {
  test.setTimeout(180_000);

  // The first import of mediabunny makes Vite optimize a new dependency and
  // reload the page, which would destroy the execution context mid-test. Warm
  // it before the run that matters.
  await page.goto("/");
  await page.evaluate(() => import("/src/videoEncoderSink.ts").then(() => true, () => false))
    .catch(() => undefined);
  await page.waitForTimeout(4_000);

  await bootConverged(page);

  const result = await page.evaluate(async (wanted: "av1" | "avc") => {
    const { createVideoSink, probeMp4Codecs, VIDEO_MIME_TYPE } = await import("/src/videoEncoderSink.ts");
    const engine = (window as any).__mandelbrotEngine;

    const width = 320, height = 180, fps = 30, frames = 20;
    const support = await probeMp4Codecs(width, height);
    if (!support[wanted]) return { skipped: true, wanted } as any;
    const sink = await createVideoSink({
      width, height, fps, codec: wanted, destination: { kind: "buffer" },
    });

    for (let n = 0; n < frames; n++) {
      const frame: VideoFrame = await engine.captureExportFrame({
        outputWidth: width, outputHeight: height, supersample: 2,
        // Presentation timestamps are uniform n/fps — NOT the parcours time,
        // which spreads over [0, duration] inclusive.
        timestampMicros: Math.round((n * 1e6) / fps),
        durationMicros: Math.round(1e6 / fps),
      });
      await sink.addFrame(frame);
    }

    const blob = await sink.finalize();
    const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer());

    // Decode it back to prove the container is real, not just well-shaped.
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.src = url;
    const meta = await new Promise<{ duration: number; w: number; h: number }>((resolve, reject) => {
      video.onloadedmetadata = () => resolve({
        duration: video.duration, w: video.videoWidth, h: video.videoHeight,
      });
      video.onerror = () => reject(new Error(`browser refused to load the produced ${wanted} MP4`));
      setTimeout(() => reject(new Error("metadata timeout")), 10_000);
    });
    URL.revokeObjectURL(url);

    return {
      codec: sink.codec, framesEncoded: sink.framesEncoded, bytes: blob.size, type: blob.type,
      magic: Array.from(head), meta, expectedFrames: frames, fps,
      fileExtension: sink.fileExtension,
      expectedMime: VIDEO_MIME_TYPE,
    };
  }, codec);

  console.log(`${codec}:`, JSON.stringify(result));
  if ((result as any).skipped) {
    test.skip(true, `${codec} cannot be encoded by this browser at this size`);
    return;
  }

  expect(result.codec).toBe(codec);
  expect(result.framesEncoded).toBe(result.expectedFrames);
  expect(result.type).toBe(result.expectedMime);
  expect(result.fileExtension).toBe("mp4");
  // ISO-BMFF: the first box is 'ftyp', whose type sits at bytes 4..7.
  expect(result.magic.slice(4)).toEqual([0x66, 0x74, 0x79, 0x70]);
  expect(result.bytes).toBeGreaterThan(1000);

  expect(result.meta.w).toBe(320);
  expect(result.meta.h).toBe(180);

  // The load-bearing property: a frame that took seconds to converge must still
  // occupy exactly 1/fps of the film. 20 frames at 30 fps is 0.667 s of video,
  // however long the capture actually took.
  const expectedDuration = result.expectedFrames / result.fps;
  expect(result.meta.duration).toBeGreaterThan(expectedDuration * 0.9);
  expect(result.meta.duration).toBeLessThan(expectedDuration * 1.15);
});
}
