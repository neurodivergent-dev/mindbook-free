/**
 * Note.ts - Note model definition
 *
 * This model defines the TypeScript type of the note objects used in our application. This way we can prevent 'never' type
 * errors.
 */

export interface Note {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  isTrash?: boolean;
  isVaulted?: boolean;
  isFavorite?: boolean;
  trashedAt?: string;
  tags?: string[];
}

/**
 * Type definition for note collection
 */
export type Notes = Note[];

/**
 * Minimum fields required to create a new note
 */
export interface NoteInput {
  title: string;
  content: string;
  category?: string;
}

/**
 * Note category type
 */
export interface Category {
  id: string;
  name: string;
  color?: string;
}

/**
 * Note label type
 */
export interface Tag {
  id: string;
  name: string;
  color?: string;
}

/**
 * Note deleted status
 */
export interface TrashNote extends Note {
  trashedAt: string; // Required field
}

/**
 * Helper function that returns an empty starting note
 */
export const createEmptyNote = (): Note => ({
  id: Date.now().toString(),
  title: '',
  content: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isArchived: false,
  isTrash: false,
  isVaulted: false,
  isFavorite: false,
});

/**
 * This default export is added to prevent Expo Router from treating this file as a route
 * NOTE: This file is not a React component, it's just a type definition file
 */
export default function NotARoute() {
  return null;
}
