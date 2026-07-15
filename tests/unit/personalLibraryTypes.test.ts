import {describe, expect, it} from 'vitest';
import {
  GUEST_SCOPE,
  isOwnerScope,
  originConsumesPersonalQuota,
  originForScope,
  scopeKey,
  userScope,
} from '../../src/personalLibraryTypes';

describe('personal library identity helpers', () => {
  it('keeps guest and user cache namespaces distinct', () => {
    expect(scopeKey(GUEST_SCOPE)).toBe('guest');
    expect(scopeKey(userScope('alice'))).toBe('user:alice');
    expect(scopeKey(userScope('bob'))).toBe('user:bob');
  });

  it('maps scopes to quota-aware origins', () => {
    expect(originForScope(GUEST_SCOPE)).toBe('guest');
    expect(originForScope(userScope('alice'))).toBe('personal');
    expect(originConsumesPersonalQuota('personal')).toBe(true);
    expect(originConsumesPersonalQuota('public')).toBe(false);
    expect(originConsumesPersonalQuota('builtIn')).toBe(false);
  });

  it('requires and compares owner UIDs', () => {
    expect(() => userScope('')).toThrow('UID');
    expect(isOwnerScope(userScope('alice'), 'alice')).toBe(true);
    expect(isOwnerScope(userScope('alice'), 'bob')).toBe(false);
  });
});
