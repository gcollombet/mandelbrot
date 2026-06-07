import {describe, expect, it} from 'vitest';
import {
  canDeleteCatalogEntry,
  canEditFavorite,
  canEditLocalDisplayName,
  canOverwriteCatalogPayload,
  canShowAdminUpload,
} from '../../src/catalogPermissions';

const remote = {publishedName: 'Gold', lastUpdated: '2026-06-07T10:00:00.000Z'};

describe('catalogPermissions', () => {
  it('shows upload controls only for admins', () => {
    expect(canShowAdminUpload('admin')).toBe(true);
    expect(canShowAdminUpload('guest')).toBe(false);
  });

  it('prevents guests from deleting or overwriting remote-origin entries', () => {
    expect(canDeleteCatalogEntry('guest', remote)).toBe(false);
    expect(canOverwriteCatalogPayload('guest', remote)).toBe(false);
  });

  it('allows admins to delete or overwrite remote-origin entries', () => {
    expect(canDeleteCatalogEntry('admin', remote)).toBe(true);
    expect(canOverwriteCatalogPayload('admin', remote)).toBe(true);
  });

  it('allows guests to manage local-only entries and local-only fields', () => {
    expect(canDeleteCatalogEntry('guest')).toBe(true);
    expect(canOverwriteCatalogPayload('guest')).toBe(true);
    expect(canEditFavorite()).toBe(true);
    expect(canEditLocalDisplayName()).toBe(true);
  });
});
