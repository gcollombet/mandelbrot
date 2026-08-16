import { expect, test, type Page } from "@playwright/test";

// Streaming output exists for two reasons: a long export must not accumulate the
// whole film in memory (which ends in "array buffer allocation failed"), and an
// interrupted run must leave a playable file rather than nothing.

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

test("streams a fragmented MP4 that stays playable when truncated", async ({ page }) => {
  test.setTimeout(180_000);

  await page.goto("/");
  await page.evaluate(() => import("/src/videoEncoderSink.ts").then(() => true, () => false))
    .catch(() => undefined);
  await page.waitForTimeout(4_000);
  await bootConverged(page);

  const result = await page.evaluate(async () => {
    const { createVideoSink } = await import("/src/videoEncoderSink.ts");
    const engine = (window as any).__mandelbrotEngine;

    const width = 320, height = 180, fps = 30, frames = 90; // 3 s, several fragments

    // Collect what the stream emits, and record how it arrives: a streaming
    // sink must hand out bytes DURING the run, not one lump at the end.
    const chunks: Uint8Array[] = [];
    const arrivals: number[] = [];
    const writable = new WritableStream<Uint8Array>({
      write(chunk) {
        chunks.push(new Uint8Array(chunk));
        arrivals.push(chunks.reduce((n, c) => n + c.byteLength, 0));
      },
    });

    const sink = await createVideoSink({
      width, height, fps, codec: "av1",
      destination: { kind: "stream", writable },
      minimumFragmentSeconds: 0.5,
    });

    let bytesBeforeLastFrame = 0;
    for (let n = 0; n < frames; n++) {
      if (n === frames - 1) bytesBeforeLastFrame = chunks.reduce((s, c) => s + c.byteLength, 0);
      const frame: VideoFrame = await engine.captureExportFrame({
        outputWidth: width, outputHeight: height, supersample: 1,
        timestampMicros: Math.round((n * 1e6) / fps),
        durationMicros: Math.round(1e6 / fps),
      });
      await sink.addFrame(frame);
    }

    const blob = await sink.finalize();
    const total = chunks.reduce((s, c) => s + c.byteLength, 0);

    const join = (upTo: number) => {
      const out = new Uint8Array(upTo);
      let at = 0;
      for (const c of chunks) {
        if (at >= upTo) break;
        const take = Math.min(c.byteLength, upTo - at);
        out.set(c.subarray(0, take), at);
        at += take;
      }
      return out;
    };

    const probe = async (bytes: Uint8Array) => {
      const url = URL.createObjectURL(new Blob([bytes], { type: "video/mp4" }));
      const v = document.createElement("video");
      v.src = url;
      v.muted = true;
      try {
        const meta = await new Promise<{ duration: number; w: number }>((res, rej) => {
          v.onloadedmetadata = () => res({ duration: v.duration, w: v.videoWidth });
          v.onerror = () => rej(new Error("unreadable"));
          setTimeout(() => rej(new Error("timeout")), 8_000);
        });
        return { ok: true, ...meta };
      } catch {
        return { ok: false, duration: 0, w: 0 };
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    return {
      streaming: sink.streaming,
      blobIsNull: blob === null,
      framesEncoded: sink.framesEncoded,
      totalBytes: total,
      // Bytes already written before the very last frame was even encoded.
      bytesBeforeLastFrame,
      whole: await probe(join(total)),
      // Cut mid-file, as an abort would.
      truncated: await probe(join(Math.floor(total * 0.6))),
    };
  });

  console.log("stream:", JSON.stringify(result));

  expect(result.streaming).toBe(true);
  // Nothing is held in memory for the caller: the bytes already went out.
  expect(result.blobIsNull).toBe(true);
  expect(result.framesEncoded).toBe(90);

  // Written progressively, not flushed once at finalize.
  expect(result.bytesBeforeLastFrame).toBeGreaterThan(result.totalBytes * 0.5);

  expect(result.whole.ok).toBe(true);
  expect(result.whole.w).toBe(320);

  // The point of fragmented MP4: a file cut short still plays.
  expect(result.truncated.ok).toBe(true);
  expect(result.truncated.duration).toBeGreaterThan(0);
});
