// This utility checks Supabase storage buckets
import supabase from './supabase';

// Bucket names
export const PROFILES_BUCKET = 'profiles';
export const BACKUPS_BUCKET = 'backups';
export const NOTES_BUCKET = 'notes';

/**
 * Check storage buckets in Supabase
 * This should be called during app initialization to verify buckets exist
 */
export const initStorage = async () => {
  try {
    // Check if required buckets exist
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('Error checking storage buckets:', error);
      return { success: false, error };
    }

    // List of required buckets
    const requiredBuckets = [PROFILES_BUCKET, BACKUPS_BUCKET, NOTES_BUCKET];

    // Check if any required buckets are missing
    const missingBuckets = requiredBuckets.filter(
      bucketName => !buckets.some(bucket => bucket.name === bucketName)
    );

    if (missingBuckets.length > 0) {
      console.warn('Missing storage buckets:', missingBuckets);
      console.warn('Please create these buckets in the Supabase dashboard');

      return {
        success: false,
        error: {
          message: `Missing required buckets: ${missingBuckets.join(', ')}`,
          code: 'missing_buckets',
        },
      };
    }

    console.log('All required storage buckets exist');
    return { success: true };
  } catch (error) {
    console.error('Error initializing storage:', error);
    return { success: false, error };
  }
};

export default initStorage;
