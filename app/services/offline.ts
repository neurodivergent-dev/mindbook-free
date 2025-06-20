// This file contains the OfflineService class, which handles offline data storage and synchronization using AsyncStorage and NetInfo.
// It provides methods to store data offline and synchronize it when the device is back online.
// The class uses AsyncStorage for storing data and NetInfo for checking the network status.
// It is designed to work with React Native applications.
// The OfflineService class is a singleton that provides methods for storing and synchronizing offline data.
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getNetworkState,
  subscribeToNetworkChanges,
  checkAndUpdateOfflineStatus,
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
  static syncInProgress = false;

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
        if (state.isConnected && state.effectivelyConnected && this.pendingOperations.length > 0) {
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
      const isOffline = await checkAndUpdateOfflineStatus();
      if (!isOffline) {
        this.syncOfflineData();
      }

      return newOperation.id;
    } catch (error) {
      console.error('Error queueing offline operation:', error);
      return null;
    }
  }

  /**
   * Synchronize offline data with the server
   */
  static async syncOfflineData() {
    // Prevent multiple sync operations from running simultaneously
    if (this.syncInProgress || this.pendingOperations.length === 0) return;

    // Double-check we're actually online before attempting sync
    const isOffline = await checkAndUpdateOfflineStatus();
    if (isOffline) return;

    this.syncInProgress = true;

    try {
      // Process operations in order (oldest first)
      const sortedOperations = [...this.pendingOperations].sort(
        (a, b) => a.timestamp - b.timestamp
      );

      const successfulOps: string[] = [];
      const failedOps: string[] = [];

      for (const operation of sortedOperations) {
        try {
          // Process operation (implementation depends on your API structure)
          // This is a placeholder - you need to implement the actual API calls
          const success = await this.processOperation();

          if (success) {
            successfulOps.push(operation.id);
          } else {
            // Increment retry count
            operation.retryCount += 1;
            if (operation.retryCount >= 5) {
              // Too many retries, consider it failed
              failedOps.push(operation.id);
              console.warn(`Operation ${operation.id} failed after 5 attempts`);
            }
          }
        } catch (error) {
          console.error(`Error processing offline operation ${operation.id}:`, error);
          operation.retryCount += 1;
        }
      }

      // Remove successful operations
      if (successfulOps.length > 0) {
        this.pendingOperations = this.pendingOperations.filter(
          op => !successfulOps.includes(op.id)
        );
      }

      // Remove failed operations that exceeded retry count
      if (failedOps.length > 0) {
        this.pendingOperations = this.pendingOperations.filter(op => !failedOps.includes(op.id));
      }

      // Save updated pending operations
      await this.savePendingOperations();
    } catch (error) {
      console.error('Error syncing offline data:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process a single offline operation
   * This is a placeholder - implement the actual API calls based on your backend
   */
  private static async processOperation(): Promise<boolean> {
    // This is where you would implement the actual API calls
    // based on operation.type, operation.entity, and operation.data
    // Return true if successful, false if failed

    // Placeholder implementation
    return new Promise(resolve => {
      setTimeout(() => {
        // Simulate 80% success rate
        resolve(Math.random() > 0.2);
      }, 500);
    });
  }

  /**
   * Save pending operations to AsyncStorage
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
    this.syncTimer = setInterval(async () => {
      const { isConnected, effectivelyConnected } = getNetworkState();
      if (isConnected && effectivelyConnected && this.pendingOperations.length > 0) {
        this.syncOfflineData();
      }
    }, this.syncInterval);
  }
}
