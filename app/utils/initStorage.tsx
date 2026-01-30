/**
 * Simplified storage init for free version
 * Everything is local only
 */
export const initStorage = async () => {
  try {
    console.log('Mindbook Free - Local storage only');
    return { success: true };
  } catch (error) {
    console.error('Error initializing local storage:', error);
    return { success: false, error };
  }
};

export default initStorage;
