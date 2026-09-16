import { describe, expect, it } from 'vitest';
import { registerShaderPreviewReader, releaseShaderPreviewReaders } from '../../src/expmap/runtime';
describe('shader archive video ownership', () => {
  it('waits for preview handles to close before returning and unregisters closed panels', async () => {
    const events: string[] = [];
    const remove = registerShaderPreviewReader(async () => {
      events.push('closing');
      await Promise.resolve();
      events.push('closed');
    });
    try {
      await releaseShaderPreviewReaders();
      events.push('video can open');
      expect(events).toEqual(['closing', 'closed', 'video can open']);
    } finally { remove(); }
    await releaseShaderPreviewReaders();
    expect(events).toHaveLength(3);
  });
});
