import {describe, expect, it} from 'vitest';
import {defaultPresetName, makeUniqueName, nameForCatalogReference, textureNameFromFileName} from '../../src/catalogIdentity';

describe('catalogIdentity', () => {
  it('uses the preset date as default complete preset name', () => {
    expect(defaultPresetName('2026-06-07T10:00:00.000Z')).toBe('2026-06-07T10:00:00.000Z');
  });

  it('uses texture file name without extension as default texture name', () => {
    expect(textureNameFromFileName('Gold.webp')).toBe('Gold');
    expect(textureNameFromFileName('/tmp/Brushed Gold.png')).toBe('Brushed Gold');
  });

  it('generates non-conflicting local names case-insensitively', () => {
    expect(makeUniqueName('Gold', ['Gold', 'Gold (2)', 'gold (3)'])).toBe('Gold (4)');
  });

  it('resolves references by GUID before falling back to names', () => {
    const textures = [
      {guid: 'local-gold', name: 'Gold'},
      {guid: 'remote-gold', name: 'Gold (2)'},
    ];

    expect(nameForCatalogReference(textures, 'remote-gold', 'Gold')).toBe('Gold (2)');
    expect(nameForCatalogReference(textures, undefined, 'Gold')).toBe('Gold');
    expect(nameForCatalogReference(textures, 'missing', 'Missing')).toBeNull();
  });
});
