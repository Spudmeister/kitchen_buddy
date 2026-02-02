/**
 * Photo Storage - IndexedDB storage for recipe photos
 * 
 * Photos are stored as blobs in IndexedDB, referenced by ID in SQLite.
 * 
 * Requirements: 7.2, 7.3
 */

import { openDB, IDBPDatabase } from 'idb';

const PHOTO_DB_NAME = 'sous-chef-photos';
const PHOTO_STORE = 'photos';
const PHOTO_DB_VERSION = 1;

let photoDb: IDBPDatabase | null = null;

/**
 * Initialize the photo storage database
 */
async function getPhotoDb(): Promise<IDBPDatabase> {
  if (!photoDb) {
    photoDb = await openDB(PHOTO_DB_NAME, PHOTO_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(PHOTO_STORE)) {
          db.createObjectStore(PHOTO_STORE);
        }
      },
    });
  }
  return photoDb;
}

/**
 * Photo storage interface for IndexedDB
 */
export const photoStorage = {
  /**
   * Save a photo to IndexedDB
   */
  async savePhoto(id: string, blob: Blob): Promise<void> {
    const db = await getPhotoDb();
    await db.put(PHOTO_STORE, blob, id);
  },

  /**
   * Get a photo from IndexedDB
   */
  async getPhoto(id: string): Promise<Blob | null> {
    const db = await getPhotoDb();
    const data = await db.get(PHOTO_STORE, id);
    if (data instanceof Blob) {
      return data;
    }
    return null;
  },

  /**
   * Delete a photo from IndexedDB
   */
  async deletePhoto(id: string): Promise<void> {
    const db = await getPhotoDb();
    await db.delete(PHOTO_STORE, id);
  },

  /**
   * Check if a photo exists
   */
  async hasPhoto(id: string): Promise<boolean> {
    const db = await getPhotoDb();
    const data = await db.get(PHOTO_STORE, id);
    return data !== undefined;
  },

  /**
   * Get all photo IDs
   */
  async getAllPhotoIds(): Promise<string[]> {
    const db = await getPhotoDb();
    const keys = await db.getAllKeys(PHOTO_STORE);
    return keys.map((key) => String(key));
  },

  /**
   * Clear all photos
   */
  async clearAll(): Promise<void> {
    const db = await getPhotoDb();
    await db.clear(PHOTO_STORE);
  },

  /**
   * Get photo as data URL for display
   */
  async getPhotoAsDataUrl(id: string): Promise<string | null> {
    const blob = await this.getPhoto(id);
    if (!blob) return null;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  /**
   * Get photo as object URL for display
   * Note: Remember to revoke the URL when done using URL.revokeObjectURL()
   */
  async getPhotoAsObjectUrl(id: string): Promise<string | null> {
    const blob = await this.getPhoto(id);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  },
};
