// Category event system for real-time updates across screens
import { EventEmitter } from 'events';

class CategoryEventEmitter extends EventEmitter {}

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