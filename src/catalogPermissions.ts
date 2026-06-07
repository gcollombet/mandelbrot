import type {UserRole} from './authService';
import type {CatalogRemoteState} from './catalogIdentity';

export function canShowAdminUpload(role: UserRole): boolean {
  return role === 'admin';
}

export function canDeleteCatalogEntry(role: UserRole, remote?: CatalogRemoteState): boolean {
  return !remote || role === 'admin';
}

export function canOverwriteCatalogPayload(role: UserRole, remote?: CatalogRemoteState): boolean {
  return !remote || role === 'admin';
}

export function canEditLocalDisplayName(): boolean {
  return true;
}

export function canEditFavorite(): boolean {
  return true;
}
