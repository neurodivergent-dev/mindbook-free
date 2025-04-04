/**
 * Helper functions to manage vault operations
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptNotes, decryptNotes } from './encryption';
import { Note } from '../models/Note';
import { getAllNotes } from './storage';

/**
 * Helper function to move notes to the vault
 * @param noteIds Note IDs to be moved to the vault
 * @returns Was the migration successful?
 */
export const handleVaultMove = async (noteIds: string[]): Promise<boolean> => {
  try {
    // Check if vault password exists before proceeding
    const storedPassword = await AsyncStorage.getItem('vault_password');
    if (!storedPassword) {
      // No vault password set - operation cannot proceed
      return false;
    }

    // 1. Take all notes
    const allNotes = await getAllNotes();

    // 2. Separate notes to be moved to the vault and notes to remain
    const notesToMove = allNotes
      .filter(note => noteIds.includes(note.id))
      .map(note => ({ ...note, isVaulted: true }));

    const remainingNotes = allNotes.filter(note => !noteIds.includes(note.id));

    // 3. Get existing notes in the vault
    const vaultNotesStr = await AsyncStorage.getItem('vault_notes');
    let vaultNotes: Note[] = [];

    if (vaultNotesStr) {
      const decryptedNotes = await decryptNotes(vaultNotesStr);
      vaultNotes = Array.isArray(decryptedNotes) ? decryptedNotes : [];
    }

    // 4. Add notes to vault
    const newVaultNotes = [...vaultNotes, ...notesToMove];
    const encryptedNotes = await encryptNotes(newVaultNotes);

    // 5. Update both places
    await Promise.all([
      AsyncStorage.setItem('notes', JSON.stringify(remainingNotes)),
      AsyncStorage.setItem('vault_notes', encryptedNotes),
    ]);

    return true;
  } catch (error) {
    console.error('Vault move error:', error);
    return false;
  }
};

/**
 * Auxiliary function to remove notes from the safe
 * @param noteIds Note IDs to be removed from the vault
 * @returns Was the extraction successful?
 */
export const removeFromVault = async (noteIds: string[]): Promise<boolean> => {
  try {
    // 1. Take notes from the safe
    const vaultNotesStr = await AsyncStorage.getItem('vault_notes');
    if (!vaultNotesStr) return false;

    const decryptedNotes = await decryptNotes(vaultNotesStr);
    const vaultNotes: Note[] = Array.isArray(decryptedNotes) ? decryptedNotes : [];

    // 2. Separate notes to be removed and notes to be retained
    const notesToMove = vaultNotes
      .filter(note => noteIds.includes(note.id))
      .map(note => ({ ...note, isVaulted: false }));

    const remainingVaultNotes = vaultNotes.filter(note => !noteIds.includes(note.id));

    // 3. Get normal grades
    const allNotes = await getAllNotes();

    // 4. Add notes to normal field
    const updatedNotes = [...allNotes, ...notesToMove];

    // 5. Update both vault and normal area
    const encryptedVaultNotes = await encryptNotes(remainingVaultNotes);

    await Promise.all([
      AsyncStorage.setItem('notes', JSON.stringify(updatedNotes)),
      AsyncStorage.setItem('vault_notes', encryptedVaultNotes),
    ]);

    return true;
  } catch (error) {
    console.error('Unboxing error:', error);
    return false;
  }
};

/**
 * This default export is added to prevent Expo Router from treating this file as a route
 * NOTE: This file is not a React component, it's just a utility file
 */
export default function NotARoute() {
  return null;
}
