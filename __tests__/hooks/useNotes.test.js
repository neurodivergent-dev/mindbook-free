// This file is for testing the useNotes hook
import React from 'react';
import { act, create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useNotes from '../../app/hooks/useNotes';

// Constants
const USER_ID = 'test-user-id';
const STORAGE_KEY = `notes_${USER_ID}`;

// Test datas
const TEST_NOTES = {
  empty: [],
  single: [{ id: 'note-1', title: 'Original Title', content: 'Original Content' }],
  multiple: [
    { id: 'note-1', title: 'Note 1', content: 'Content 1' },
    { id: 'note-2', title: 'Note 2', content: 'Content 2' },
  ],
};

// Function for auth handler
let triggerAuthChange = null;

beforeEach(() => {
  jest.clearAllMocks();

  // Clear the mock store
  global.mockStore = {};

  // AsyncStorage mocks
  AsyncStorage.setItem.mockImplementation((key, value) => {
    // disable clearAllNotes - do not allow setting empty array
    if (key.startsWith('notes_') && value === JSON.stringify([])) {
      console.log(`[Mock] clearAllNotes engellendi: ${key}`);
      return Promise.resolve();
    }

    console.log(`[Mock] setItem: ${key} = ${value}`);
    global.mockStore[key] = value;
    return Promise.resolve();
  });

  AsyncStorage.getItem.mockImplementation(key => {
    console.log(`[Mock] getItem: ${key} => ${global.mockStore[key] || 'null'}`);
    return Promise.resolve(global.mockStore[key] || null);
  });

  AsyncStorage.removeItem.mockImplementation(key => {
    delete global.mockStore[key];
    return Promise.resolve();
  });

  AsyncStorage.clear.mockImplementation(() => {
    global.mockStore = {};
    return Promise.resolve();
  });
});

// Supabase mocks
jest.mock('../../app/utils/supabase', () => ({
  __esModule: true,
  default: {
    auth: {
      getUser: jest.fn(() =>
        Promise.resolve({
          data: { user: { id: USER_ID } },
          error: null,
        })
      ),
      onAuthStateChange: jest.fn(handler => {
        triggerAuthChange = async () => {
          await handler('SIGNED_IN', { user: { id: USER_ID } });
        };
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      }),
    },
  },
}));

// Test component
function TestComponent({ onHookResult }) {
  const hookResult = useNotes();

  React.useEffect(() => {
    onHookResult(hookResult);
  }, [hookResult, onHookResult]);

  return null;
}

// Wait function
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Test setup function
async function setupTest(initialNotes) {
  // Add test data to mockStore
  global.mockStore[STORAGE_KEY] = JSON.stringify(initialNotes);

  // Create the test component
  const onHookResult = jest.fn();
  let root;

  await act(async () => {
    root = create(<TestComponent onHookResult={onHookResult} />);
    await wait(50);
  });

  // Trigger auth change
  await act(async () => {
    await triggerAuthChange();
    await wait(50);
  });

  // Get current hook status
  const hookResult = onHookResult.mock.calls[onHookResult.mock.calls.length - 1][0];

  return { root, hookResult, onHookResult };
}

// Tests
describe('useNotes Hook', () => {
  test('should initialize with empty notes array', async () => {
    const { hookResult } = await setupTest(TEST_NOTES.empty);

    expect(hookResult.loading).toBe(false);
    expect(hookResult.notes).toEqual([]);
  });

  test('addNote should add a new note', async () => {
    const { hookResult, onHookResult, root } = await setupTest(TEST_NOTES.empty);

    // Add note
    await act(async () => {
      await hookResult.addNote({ title: 'New Note', content: 'New Content' });
      await wait(50);
    });

    // Get current status
    const updatedResult = onHookResult.mock.calls[onHookResult.mock.calls.length - 1][0];

    expect(updatedResult.notes.length).toBe(1);
    expect(updatedResult.notes[0].title).toBe('New Note');
    expect(updatedResult.notes[0].content).toBe('New Content');

    root.unmount();
  });

  test('updateNote should update an existing note', async () => {
    const { hookResult, onHookResult, root } = await setupTest(TEST_NOTES.single);

    // Check initial values
    expect(hookResult.notes.length).toBe(1);
    expect(hookResult.notes[0].title).toBe('Original Title');

    // Update note
    await act(async () => {
      await hookResult.updateNote('note-1', { title: 'Updated Title' });
      await wait(50);
    });

    // Get current status
    const updatedResult = onHookResult.mock.calls[onHookResult.mock.calls.length - 1][0];

    expect(updatedResult.notes.length).toBe(1);
    expect(updatedResult.notes[0].title).toBe('Updated Title');
    expect(updatedResult.notes[0].content).toBe('Original Content');

    root.unmount();
  });

  test('deleteNote should remove a note', async () => {
    const { hookResult, onHookResult, root } = await setupTest(TEST_NOTES.multiple);

    // Check initial values
    expect(hookResult.notes.length).toBe(2);

    // Delete note
    await act(async () => {
      await hookResult.deleteNote('note-1');
      await wait(50);
    });

    // Get current status
    const updatedResult = onHookResult.mock.calls[onHookResult.mock.calls.length - 1][0];

    expect(updatedResult.notes.length).toBe(1);
    expect(updatedResult.notes[0].id).toBe('note-2');

    root.unmount();
  });
});
