import type {MandelbrotParams} from './Mandelbrot';
import {getFirebaseServices} from './firebaseConfig';
import {getPresetById, updatePresetEntry, type PresetRecord} from './presetStore';
import {getSharedPresetRecord, getSharedTexture} from './personalLibraryRemote';
import {requestPersonalPresetSync} from './personalPresetSync';
import {requestPersonalTextureSync} from './personalTextureSync';
import {getActiveLibraryScope} from './scopedCache';
import {getAllTextureEntries} from './textureStore';
import {registerSharedTexture} from './sharedSceneTextures';

export const SCENE_QUERY_PARAMETER = 'scene';
export const OWNER_QUERY_PARAMETER = 'owner';

export function sceneShareQuery(owner: string, guid: string): Record<string, string> {
  return {[OWNER_QUERY_PARAMETER]: owner, [SCENE_QUERY_PARAMETER]: guid};
}

/** The runner reports failures through status; re-read the record before claiming success. */
export async function prepareSceneShare(id: number): Promise<Record<string, string>> {
  const record = await getPresetById(id);
  if (!record) throw new Error('Ce preset n’existe plus.');
  if (record.remote) return {preset: record.guid};
  const uid = getFirebaseServices()?.auth.currentUser?.uid;
  const scope = getActiveLibraryScope();
  if (!uid || scope.kind !== 'user' || scope.uid !== uid || record.origin !== 'personal') {
    throw new Error('Connectez-vous et enregistrez cette scène dans votre bibliothèque pour la partager.');
  }
  const assertOwner = () => {
    const currentScope = getActiveLibraryScope();
    if (getFirebaseServices()?.auth.currentUser?.uid !== uid || currentScope.kind !== 'user' || currentScope.uid !== uid
      || (record.ownerScopeKey && record.ownerScopeKey !== `user:${uid}`)) {
      throw new Error('Le compte a changé pendant le partage. Réessayez.');
    }
  };
  assertOwner();
  await requestPersonalTextureSync();
  assertOwner();
  const textures = await getAllTextureEntries();
  assertOwner();
  let normalizedReferences = false;
  for (const [guidKey, nameKey] of [['textureGuid', 'textureName'], ['skyboxGuid', 'skyboxName']] as const) {
    const guid = record.value[guidKey];
    const texture = guid ? textures.find(t => t.guid === guid) : textures.find(t => t.name === record.value[nameKey]);
    if (guid && !texture || texture?.origin === 'personal' && texture.syncState !== 'synced') {
      throw new Error('Une texture n’est pas encore synchronisée. Réessayez après la sauvegarde cloud.');
    }
    // Older presets referred to textures only by local name, which is not portable.
    if (!guid && texture?.guid) { record.value[guidKey] = texture.guid; normalizedReferences = true; }
  }
  if (normalizedReferences) await updatePresetEntry(record);
  await requestPersonalPresetSync();
  const current = await getPresetById(id);
  if (getFirebaseServices()?.auth.currentUser?.uid !== uid || current?.guid !== record.guid || current?.syncState !== 'synced') {
    throw new Error('La scène n’est pas encore synchronisée. Vérifiez la connexion puis réessayez.');
  }
  return sceneShareQuery(uid, current.guid);
}

export async function loadSharedScene(owner: string, guid: string): Promise<PresetRecord> {
  const envelope = await getSharedPresetRecord(owner, guid);
  if (!envelope || envelope.type !== 'completePreset') throw new Error('Cette scène est introuvable ou a été supprimée.');
  const payload = envelope.payload as Partial<PresetRecord>;
  if (!payload?.value || typeof payload.value.cx !== 'string' || typeof payload.value.cy !== 'string' || !Array.isArray(payload.value.colorStops)) {
    throw new Error('Cette scène ne contient pas un preset valide.');
  }
  const value = structuredClone(payload.value) as MandelbrotParams;
  const local = await getAllTextureEntries();
  const scope = getActiveLibraryScope();
  for (const [guidKey, nameKey] of [['textureGuid', 'textureName'], ['skyboxGuid', 'skyboxName']] as const) {
    const textureGuid = value[guidKey];
    if (!textureGuid) continue;
    const available = local.find(t => t.guid === textureGuid && (t.origin === 'public' || (scope.kind === 'user' && scope.uid === owner)));
    if (available) { value[nameKey] = available.name; continue; }
    const texture = await getSharedTexture(owner, textureGuid);
    if (!texture) throw new Error('Une texture de cette scène n’est plus disponible.');
    // Owner-qualified identities avoid collisions with the visitor's own library.
    const alias = `shared:${owner}:${textureGuid}`;
    const name = `${texture.metadata.name} · partagé ${owner}:${textureGuid}`;
    registerSharedTexture({...texture.metadata, guid: alias, name, date: texture.metadata.updatedAt}, texture.blob);
    value[guidKey] = alias;
    value[nameKey] = name;
  }
  return {id: -1, guid, name: envelope.name, value, thumbnail: envelope.thumbnail || '',
    date: envelope.updatedAt, lastUpdated: envelope.updatedAt, scaleExponent: payload.scaleExponent ?? 0};
}
