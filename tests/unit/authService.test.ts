import {describe, expect, it} from 'vitest';
import {libraryScopeForUser, normalizeAuthenticatedRole} from '../../src/authService';
import {scopeKey} from '../../src/personalLibraryTypes';

describe('authService role normalization', () => {
  it('keeps trusted admin authorization', () => {
    expect(normalizeAuthenticatedRole('admin')).toBe('admin');
  });

  it('maps every non-admin authenticated result to user', () => {
    expect(normalizeAuthenticatedRole('user')).toBe('user');
    expect(normalizeAuthenticatedRole('guest')).toBe('user');
    expect(normalizeAuthenticatedRole(undefined)).toBe('user');
  });

  it('restores guest scope on sign-out', () => {
    expect(scopeKey(libraryScopeForUser(null))).toBe('guest');
  });

  it('switches cache scope with the authenticated UID', () => {
    expect(scopeKey(libraryScopeForUser({uid: 'alice'}))).toBe('user:alice');
    expect(scopeKey(libraryScopeForUser({uid: 'bob'}))).toBe('user:bob');
  });
});
