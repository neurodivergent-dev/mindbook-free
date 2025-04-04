// This file is responsible for creating the Redux store and exporting it for use in the application.
// It uses Redux Toolkit's configureStore function to set up the store with the notes reducer.
// The store is then exported for use in the application, allowing components to connect to the Redux store and access the state.
import { configureStore } from '@reduxjs/toolkit';
import notesReducer from './notesSlice';

const store = configureStore({
  reducer: {
    notes: notesReducer,
  },
});

export { store };
export default store;
