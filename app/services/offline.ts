// This file contains the OfflineService class, which handles offline data storage and synchronization using AsyncStorage and NetInfo.
// It provides methods to store data offline and synchronize it when the device is back online.
// The class uses AsyncStorage for storing data and NetInfo for checking the network status.
// It is designed to work with React Native applications.
// The OfflineService class is a singleton that provides methods for storing and synchronizing offline data.
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export class OfflineService {
  static async storeData(key: string, data: any) {
    try {
      await AsyncStorage.setItem(
        key,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('Error storing offline data:', error);
    }
  }

  static async syncOfflineData() {
    const isConnected = await NetInfo.fetch().then(state => state.isConnected);
    if (!isConnected) return;

    // Synchronize offline data
    try {
      await AsyncStorage.getAllKeys();
      // Synchronization logic here
    } catch (error) {
      console.error('Sync error:', error);
    }
  }
}
