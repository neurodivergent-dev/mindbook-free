import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const PROFILE_IMAGE_CACHE_KEY = '@profile_image_cache';
const PROFILE_IMAGE_DIR = `${FileSystem.documentDirectory}profile_images/`;

interface ProfileImageCache {
  userId: string;
  cloudinaryUrl: string;
  localPath: string;
  timestamp: number;
  publicId?: string;
}

/**
 * Profile Image Cache Service
 * Manages local caching of profile images for offline access
 */
export class ProfileImageCacheService {
  /**
   * Initialize cache directory
   */
  private async ensureCacheDirectoryExists(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(PROFILE_IMAGE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(PROFILE_IMAGE_DIR, { intermediates: true });
        console.log('📁 Profile image cache directory created');
      }
    } catch (error) {
      console.error('❌ Error creating cache directory:', error);
    }
  }

  /**
   * Download and cache profile image locally
   */
  async cacheProfileImage(
    userId: string,
    cloudinaryUrl: string,
    publicId?: string
  ): Promise<string | null> {
    try {
      console.log('💾 Caching profile image for user:', userId);

      await this.ensureCacheDirectoryExists();

      // Generate local filename
      const filename = `${userId}_${Date.now()}.jpg`;
      const localPath = `${PROFILE_IMAGE_DIR}${filename}`;

      // Download image from Cloudinary
      const downloadResult = await FileSystem.downloadAsync(cloudinaryUrl, localPath);

      if (downloadResult.status === 200) {
        // Save cache metadata
        const cacheEntry: ProfileImageCache = {
          userId,
          cloudinaryUrl,
          localPath,
          timestamp: Date.now(),
          publicId,
        };

        await this.saveCacheEntry(cacheEntry);
        console.log('✅ Profile image cached successfully:', localPath);
        return localPath;
      } else {
        console.error('❌ Failed to download profile image:', downloadResult.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Error caching profile image:', error);
      return null;
    }
  }

  /**
   * Get cached profile image path for user
   */
  async getCachedProfileImage(userId: string): Promise<string | null> {
    try {
      const cacheEntry = await this.getCacheEntry(userId);

      if (!cacheEntry) {
        console.log('🔍 No cached profile image found for user:', userId);
        return null;
      }

      // Check if cached file still exists
      const fileInfo = await FileSystem.getInfoAsync(cacheEntry.localPath);
      if (fileInfo.exists) {
        console.log('✅ Using cached profile image:', cacheEntry.localPath);
        return cacheEntry.localPath;
      } else {
        console.log('🗑️ Cached file no longer exists, removing cache entry');
        await this.removeCacheEntry(userId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting cached profile image:', error);
      return null;
    }
  }

  /**
   * Check if profile image is already cached and up to date
   */
  async isCached(userId: string, cloudinaryUrl: string): Promise<boolean> {
    try {
      const cacheEntry = await this.getCacheEntry(userId);

      if (!cacheEntry) return false;

      // Check if URL matches and file exists
      if (cacheEntry.cloudinaryUrl === cloudinaryUrl) {
        const fileInfo = await FileSystem.getInfoAsync(cacheEntry.localPath);
        return fileInfo.exists;
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking cache status:', error);
      return false;
    }
  }

  /**
   * Remove cached profile image for user
   */
  async removeCachedProfileImage(userId: string): Promise<void> {
    try {
      const cacheEntry = await this.getCacheEntry(userId);

      if (cacheEntry) {
        // Delete local file
        const fileInfo = await FileSystem.getInfoAsync(cacheEntry.localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(cacheEntry.localPath);
          console.log('🗑️ Deleted cached profile image file:', cacheEntry.localPath);
        }

        // Remove from cache metadata
        await this.removeCacheEntry(userId);
      }
    } catch (error) {
      console.error('❌ Error removing cached profile image:', error);
    }
  }

  /**
   * Clear all cached profile images
   */
  async clearAllCache(): Promise<void> {
    try {
      // Remove cache directory
      const dirInfo = await FileSystem.getInfoAsync(PROFILE_IMAGE_DIR);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(PROFILE_IMAGE_DIR);
        console.log('🗑️ Cleared all cached profile images');
      }

      // Clear cache metadata
      await AsyncStorage.removeItem(PROFILE_IMAGE_CACHE_KEY);
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }

  /**
   * Get cache entry for user
   */
  private async getCacheEntry(userId: string): Promise<ProfileImageCache | null> {
    try {
      const cacheData = await AsyncStorage.getItem(PROFILE_IMAGE_CACHE_KEY);
      if (!cacheData) return null;

      const cacheMap: Record<string, ProfileImageCache> = JSON.parse(cacheData);
      return cacheMap[userId] || null;
    } catch (error) {
      console.error('❌ Error getting cache entry:', error);
      return null;
    }
  }

  /**
   * Save cache entry for user
   */
  private async saveCacheEntry(cacheEntry: ProfileImageCache): Promise<void> {
    try {
      let cacheMap: Record<string, ProfileImageCache> = {};

      const existingData = await AsyncStorage.getItem(PROFILE_IMAGE_CACHE_KEY);
      if (existingData) {
        cacheMap = JSON.parse(existingData);
      }

      // Remove old cached file if exists
      const oldEntry = cacheMap[cacheEntry.userId];
      if (oldEntry && oldEntry.localPath !== cacheEntry.localPath) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(oldEntry.localPath);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(oldEntry.localPath);
            console.log('🗑️ Deleted old cached image:', oldEntry.localPath);
          }
        } catch (deleteError) {
          console.error('⚠️ Error deleting old cached image:', deleteError);
        }
      }

      cacheMap[cacheEntry.userId] = cacheEntry;
      await AsyncStorage.setItem(PROFILE_IMAGE_CACHE_KEY, JSON.stringify(cacheMap));
    } catch (error) {
      console.error('❌ Error saving cache entry:', error);
    }
  }

  /**
   * Remove cache entry for user
   */
  private async removeCacheEntry(userId: string): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem(PROFILE_IMAGE_CACHE_KEY);
      if (!cacheData) return;

      const cacheMap: Record<string, ProfileImageCache> = JSON.parse(cacheData);
      delete cacheMap[userId];

      await AsyncStorage.setItem(PROFILE_IMAGE_CACHE_KEY, JSON.stringify(cacheMap));
    } catch (error) {
      console.error('❌ Error removing cache entry:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalCachedImages: number;
    totalCacheSize: number;
    oldestCacheTimestamp: number | null;
  }> {
    try {
      const cacheData = await AsyncStorage.getItem(PROFILE_IMAGE_CACHE_KEY);
      if (!cacheData) {
        return { totalCachedImages: 0, totalCacheSize: 0, oldestCacheTimestamp: null };
      }

      const cacheMap: Record<string, ProfileImageCache> = JSON.parse(cacheData);
      const entries = Object.values(cacheMap);

      let totalSize = 0;
      let oldestTimestamp: number | null = null;

      for (const entry of entries) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
          if (fileInfo.exists) {
            totalSize += fileInfo.size || 0;
            if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
              oldestTimestamp = entry.timestamp;
            }
          }
        } catch (error) {
          console.error('Error getting file info for:', entry.localPath, error);
        }
      }

      return {
        totalCachedImages: entries.length,
        totalCacheSize: totalSize,
        oldestCacheTimestamp: oldestTimestamp,
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return { totalCachedImages: 0, totalCacheSize: 0, oldestCacheTimestamp: null };
    }
  }
}

// Export singleton instance
export const profileImageCache = new ProfileImageCacheService();

export default profileImageCache;
