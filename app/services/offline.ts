// This file contains the OfflineService class, which handles offline data storage and synchronization using AsyncStorage and NetInfo.
// It provides methods to store data offline and synchronize it when the device is back online.
// The class uses AsyncStorage for storing data and NetInfo for checking the network status.
// It is designed to work with React Native applications.
// The OfflineService class is a singleton that provides methods for storing and synchronizing offline data.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getNetworkState,
  subscribeToNetworkChanges,
  withNetworkTimeout,
} from '../utils/networkManager';

// Keys for storing offline data and operations
export const OFFLINE_OPERATIONS_KEY = '@offline_operations';
export const OFFLINE_DATA_KEY = '@offline_data';

// Types for offline operations and data
export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export class OfflineService {
  static isInitialized = false;
  static pendingOperations: OfflineOperation[] = [];
  static syncTimer: NodeJS.Timeout | null = null;
  static syncInterval = 30000; // 30 seconds

  /**
   * Initialize the OfflineService and load any pending operations
   */
  static async initialize() {
    if (this.isInitialized) return;

    try {
      // Load any pending operations from storage
      const storedOperations = await AsyncStorage.getItem(OFFLINE_OPERATIONS_KEY);
      if (storedOperations) {
        this.pendingOperations = JSON.parse(storedOperations);
      }

      // Setup network state change listener
      subscribeToNetworkChanges(state => {
        if (state.isConnected && this.pendingOperations.length > 0) {
          this.syncOfflineData();
        }
      });

      // Start periodic sync attempts
      this.setupSyncTimer();

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing OfflineService:', error);
    }
  }

  /**
   * Store data for offline use
   */
  static async storeData(key: string, data: any) {
    try {
      await AsyncStorage.setItem(
        `${OFFLINE_DATA_KEY}:${key}`,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('Error storing offline data:', error);
    }
  }

  /**
   * Retrieve data stored for offline use
   */
  static async getData(key: string) {
    try {
      const item = await AsyncStorage.getItem(`${OFFLINE_DATA_KEY}:${key}`);
      if (!item) return null;

      return JSON.parse(item);
    } catch (error) {
      console.error('Error retrieving offline data:', error);
      return null;
    }
  }

  /**
   * Queue an operation to be performed when online
   */
  static async queueOperation(
    operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>
  ) {
    try {
      const newOperation: OfflineOperation = {
        ...operation,
        id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0,
      };

      this.pendingOperations.push(newOperation);
      await this.savePendingOperations();

      // Try to sync immediately if we're online
      if (getNetworkState().isConnected) {
        this.syncOfflineData();
      }

      return newOperation.id;
    } catch (error) {
      console.error('Error queueing offline operation:', error);
      return null;
    }
  }

  /**
   * Save the pending operations to AsyncStorage
   */
  private static async savePendingOperations() {
    try {
      await AsyncStorage.setItem(OFFLINE_OPERATIONS_KEY, JSON.stringify(this.pendingOperations));
    } catch (error) {
      console.error('Error saving pending operations:', error);
    }
  }

  /**
   * Setup a timer to periodically attempt synchronization
   */
  private static setupSyncTimer() {
    // Clear any existing timer
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    // Set up new timer
    this.syncTimer = setInterval(() => {
      if (getNetworkState().isConnected && this.pendingOperations.length > 0) {
        this.syncOfflineData();
      }
    }, this.syncInterval);
  }

  /**
   * Synchronize offline data with the backend
   */
  static async syncOfflineData() {
    if (!getNetworkState().isConnected || this.pendingOperations.length === 0) return;

    try {
      // Process operations in order they were created
      const sortedOperations = [...this.pendingOperations].sort(
        (a, b) => a.timestamp - b.timestamp
      );

      // Process each operation
      for (const operation of sortedOperations) {
        // Check if we're still online before each operation
        if (!getNetworkState().isConnected) {
          break;
        }

        try {
          // Attempt to execute the operation with a timeout
          // This would integrate with your API services
          await withNetworkTimeout(async () => {
            // Here you would call your API or service methods based on operation type
            // For example:
            // if (operation.type === 'create' && operation.entity === 'note') {
            //   await noteService.createNote(operation.data);
            // }

            // Log success - replace with actual implementation
            console.log(`Executed offline operation: ${operation.id}`);
          }, 5000); // 5 second timeout for operations

          // Remove the operation from the pending list if successful
          this.pendingOperations = this.pendingOperations.filter(op => op.id !== operation.id);
          await this.savePendingOperations();
        } catch (error) {
          // Increment retry count
          const operationIndex = this.pendingOperations.findIndex(op => op.id === operation.id);
          if (operationIndex !== -1) {
            this.pendingOperations[operationIndex].retryCount += 1;

            // If we've retried too many times, consider removing the operation
            if (this.pendingOperations[operationIndex].retryCount > 5) {
              console.warn(`Operation ${operation.id} failed too many times, removing`);
              this.pendingOperations = this.pendingOperations.filter(op => op.id !== operation.id);
            }

            await this.savePendingOperations();
          }

          console.error(`Error processing offline operation ${operation.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    }
  }

  /**
   * Get the current pending operations
   */
  static getPendingOperations(): OfflineOperation[] {
    return [...this.pendingOperations];
  }

  /**
   * Clear all pending operations
   */
  static async clearPendingOperations() {
    this.pendingOperations = [];
    await this.savePendingOperations();
  }
}
