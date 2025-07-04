import AsyncStorage from '@react-native-async-storage/async-storage';

const ANALYZE_KEY = 'note_ai_analyzes';

export const saveNoteAnalyze = async (noteId, analyze) => {
  const raw = await AsyncStorage.getItem(ANALYZE_KEY);
  const all = raw ? JSON.parse(raw) : {};
  if (!all[noteId]) all[noteId] = [];
  all[noteId].push(analyze);
  await AsyncStorage.setItem(ANALYZE_KEY, JSON.stringify(all));
};

export const getNoteAnalyzes = async noteId => {
  const raw = await AsyncStorage.getItem(ANALYZE_KEY);
  const all = raw ? JSON.parse(raw) : {};
  return all[noteId] || [];
};

export const deleteNoteAnalyze = async (noteId, index) => {
  const raw = await AsyncStorage.getItem(ANALYZE_KEY);
  const all = raw ? JSON.parse(raw) : {};
  if (all[noteId]) {
    all[noteId].splice(index, 1);
    await AsyncStorage.setItem(ANALYZE_KEY, JSON.stringify(all));
  }
};
