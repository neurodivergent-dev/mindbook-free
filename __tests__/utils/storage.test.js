import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTES_KEY, getAllNotes, saveNote, updateNote } from '../../app/utils/storage';

// Mock the backup module to avoid actual API calls
jest.mock('../../app/utils/backup', () => ({
  backupToCloud: jest.fn(() => Promise.resolve()),
  getCurrentUserId: jest.fn(() => Promise.resolve('test-user-id')),
}));

describe('Storage Utilities', () => {
  // Clear AsyncStorage before each test
  beforeEach(() => {
    AsyncStorage.clear();
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
  });

  describe('getAllNotes', () => {
    test('should return empty array when no notes exist', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);
      const notes = await getAllNotes();
      expect(notes).toEqual([]);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(NOTES_KEY);
    });

    test('should return notes when they exist', async () => {
      const mockNotes = [{ id: '1', title: 'Test Note' }];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockNotes));

      const notes = await getAllNotes();
      expect(notes).toEqual(mockNotes);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(NOTES_KEY);
    });

    test('should handle invalid JSON', async () => {
      AsyncStorage.getItem.mockResolvedValue('invalid-json');

      const notes = await getAllNotes();
      expect(notes).toEqual([]);
    });
  });

  describe('saveNote', () => {
    test('should add a new note to empty storage', async () => {
      AsyncStorage.getItem.mockResolvedValue(null);

      const newNote = { title: 'Test Note', content: 'Test Content' };
      const result = await saveNote(newNote);

      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalled();

      // Verify the note has been saved with all required properties
      const savedNoteJson = AsyncStorage.setItem.mock.calls[0][1];
      const savedNotes = JSON.parse(savedNoteJson);

      expect(savedNotes.length).toBe(1);
      expect(savedNotes[0].title).toBe('Test Note');
      expect(savedNotes[0].content).toBe('Test Content');
      expect(savedNotes[0].id).toBeDefined();
      expect(savedNotes[0].createdAt).toBeDefined();
      expect(savedNotes[0].updatedAt).toBeDefined();
      expect(savedNotes[0].isFavorite).toBe(false);
      expect(savedNotes[0].isArchived).toBe(false);
      expect(savedNotes[0].isTrash).toBe(false);
    });

    test('should add a new note to existing notes', async () => {
      const existingNotes = [
        { id: 'existing-1', title: 'Existing Note', content: 'Existing Content' },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingNotes));

      const newNote = { title: 'New Note', content: 'New Content' };
      const result = await saveNote(newNote);

      expect(result).toBe(true);

      // Verify the new note has been added at the beginning of the array
      const savedNoteJson = AsyncStorage.setItem.mock.calls[0][1];
      const savedNotes = JSON.parse(savedNoteJson);

      expect(savedNotes.length).toBe(2);
      expect(savedNotes[0].title).toBe('New Note');
      expect(savedNotes[1].title).toBe('Existing Note');
    });
  });

  describe('updateNote', () => {
    test('should update an existing note', async () => {
      const existingNotes = [
        { id: 'note-1', title: 'Original Title', content: 'Original Content' },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingNotes));

      const updatedNote = { title: 'Updated Title' };
      const result = await updateNote('note-1', updatedNote);

      expect(result).toBe(true);

      // Verify the note has been updated correctly
      const savedNoteJson = AsyncStorage.setItem.mock.calls[0][1];
      const savedNotes = JSON.parse(savedNoteJson);

      expect(savedNotes.length).toBe(1);
      expect(savedNotes[0].title).toBe('Updated Title');
      expect(savedNotes[0].content).toBe('Original Content'); // unchanged property
      expect(savedNotes[0].updatedAt).toBeDefined(); // should be updated
    });

    test('should throw error when note is not found', async () => {
      const existingNotes = [
        { id: 'note-1', title: 'Original Title', content: 'Original Content' },
      ];
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingNotes));

      await expect(updateNote('non-existent-id', { title: 'New Title' })).rejects.toThrow(
        'Error updating note'
      );
    });
  });

  // You can add similar tests to test other methods
});
