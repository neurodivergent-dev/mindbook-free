// Category event system for real-time updates across screens

// Simple EventEmitter implementation for React Native
class SimpleEventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event: string, listener: Function) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }

  removeAllListeners(event?: string) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
}

class CategoryEventEmitter extends SimpleEventEmitter {}

export const categoryEvents = new CategoryEventEmitter();

// Event types
export const CATEGORY_EVENTS = {
  CATEGORY_ADDED: 'category_added',
  CATEGORY_DELETED: 'category_deleted',
  CATEGORY_UPDATED: 'category_updated',
  CATEGORIES_CHANGED: 'categories_changed',
} as const;

// Helper functions to emit events
export const emitCategoryAdded = (categoryName: string) => {
  categoryEvents.emit(CATEGORY_EVENTS.CATEGORY_ADDED, categoryName);
  categoryEvents.emit(CATEGORY_EVENTS.CATEGORIES_CHANGED);
};

export const emitCategoryDeleted = (categoryName: string) => {
  categoryEvents.emit(CATEGORY_EVENTS.CATEGORY_DELETED, categoryName);
  categoryEvents.emit(CATEGORY_EVENTS.CATEGORIES_CHANGED);
};

export const emitCategoryUpdated = (oldName: string, newName: string) => {
  categoryEvents.emit(CATEGORY_EVENTS.CATEGORY_UPDATED, { oldName, newName });
  categoryEvents.emit(CATEGORY_EVENTS.CATEGORIES_CHANGED);
};

export const emitCategoriesChanged = () => {
  categoryEvents.emit(CATEGORY_EVENTS.CATEGORIES_CHANGED);
};