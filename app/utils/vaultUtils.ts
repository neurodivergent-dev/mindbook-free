/**
 * Helper functions to manage vault operations
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  encryptVaultNotes,
  decryptVaultNotes,
  emergencyVaultDataRecovery,
} from './vaultEncryption';
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

    // 3. Get existing notes in the vault with proper vault encryption
    const vaultNotesStr = await AsyncStorage.getItem('vault_notes');
    let vaultNotes: Note[] = [];

    if (vaultNotesStr) {
      try {
        const decryptedNotes = await decryptVaultNotes(vaultNotesStr);
        vaultNotes = Array.isArray(decryptedNotes) ? decryptedNotes : [];
      } catch (error) {
        console.warn('Failed to decrypt existing vault notes, attempting recovery...');
        const recoveredNotes = await emergencyVaultDataRecovery(vaultNotesStr);
        vaultNotes = Array.isArray(recoveredNotes) ? recoveredNotes : [];
      }
    }

    // 4. Add notes to vault
    const newVaultNotes = [...vaultNotes, ...notesToMove];
    const encryptedNotes = await encryptVaultNotes(newVaultNotes);

    if (!encryptedNotes) {
      console.error('Failed to encrypt vault notes');
      return false;
    }

    // 5. Update both places
    await Promise.all([
      AsyncStorage.setItem('notes', JSON.stringify(remainingNotes)),
      AsyncStorage.setItem('vault_notes', encryptedNotes),
    ]);

    console.log(`✅ Successfully moved ${notesToMove.length} notes to vault`);
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
    // 1. Take notes from the safe with proper vault encryption
    const vaultNotesStr = await AsyncStorage.getItem('vault_notes');
    if (!vaultNotesStr) return false;

    let vaultNotes: Note[] = [];

    try {
      const decryptedNotes = await decryptVaultNotes(vaultNotesStr);
      vaultNotes = Array.isArray(decryptedNotes) ? decryptedNotes : [];
    } catch (error) {
      console.warn('Failed to decrypt vault notes, attempting recovery...');
      const recoveredNotes = await emergencyVaultDataRecovery(vaultNotesStr);
      vaultNotes = Array.isArray(recoveredNotes) ? recoveredNotes : [];

      if (vaultNotes.length === 0) {
        console.error('Could not recover vault notes for removal');
        return false;
      }
    }

    // 2. Separate notes to be removed and notes to be retained
    const notesToMove = vaultNotes
      .filter(note => noteIds.includes(note.id))
      .map(note => ({ ...note, isVaulted: false }));

    const remainingVaultNotes = vaultNotes.filter(note => !noteIds.includes(note.id));

    // 3. Get normal grades
    const allNotes = await getAllNotes();

    // 4. Add notes to normal field
    const updatedNotes = [...allNotes, ...notesToMove];

    // 5. Update both vault and normal area with proper vault encryption
    const encryptedVaultNotes = await encryptVaultNotes(remainingVaultNotes);

    if (!encryptedVaultNotes) {
      console.error('Failed to encrypt remaining vault notes');
      return false;
    }

    await Promise.all([
      AsyncStorage.setItem('notes', JSON.stringify(updatedNotes)),
      AsyncStorage.setItem('vault_notes', encryptedVaultNotes),
    ]);

    console.log(`✅ Successfully removed ${notesToMove.length} notes from vault`);
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
