// This file is Notes Slice for Redux Toolkit
// It manages the state of notes in the application
// It includes actions to set, add, update, delete notes and manage loading and error states
// It uses createSlice from Redux Toolkit to create the slice and its actions
// It exports the reducer and actions to be used in the store and components
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  notes: [],
  isLoading: false,
  error: null,
};

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    setNotes: (state, action) => {
      state.notes = action.payload;
    },
    addNote: (state, action) => {
      state.notes.push(action.payload);
    },
    updateNote: (state, action) => {
      const index = state.notes.findIndex(note => note.id === action.payload.id);
      if (index !== -1) {
        state.notes[index] = action.payload;
      }
    },
    deleteNote: (state, action) => {
      state.notes = state.notes.filter(note => note.id !== action.payload);
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setNotes, addNote, updateNote, deleteNote, setLoading, setError } =
  notesSlice.actions;

export default notesSlice.reducer;
