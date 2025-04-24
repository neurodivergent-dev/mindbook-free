import supabase from './supabase';
import * as FileSystem from 'expo-file-system';
import { ENV } from './envConfig';

/**
 * CloudinaryService - Manages Cloudinary-related operations for the mobile app
 */
class CloudinaryService {
  private cloudName: string;
  private uploadPreset: string;

  constructor() {
    // Get configuration from environment variables
    this.cloudName = ENV.CLOUDINARY_CLOUD_NAME;
    this.uploadPreset = 'mindbook_unsigned'; // Use the same preset as web app

    // Validate configuration
    if (!this.cloudName) {
      console.warn('CloudinaryService: Cloudinary cloud name is not configured');
    } else {
      console.log('CloudinaryService initialized with cloud name:', this.cloudName);
    }
  }

  /**
   * Uploads a profile image to Cloudinary using a unique ID
   * @param imageUri - Local URI of the image file
   * @param userId - User ID to associate with the image
   * @returns Promise with the upload result
   */
  async uploadProfileImage(
    imageUri: string,
    userId: string
  ): Promise<{ success: boolean; url?: string; publicId?: string; error?: string }> {
    try {
      // Create a unique ID for the image
      const uniqueId = `user-${userId}-${Date.now()}`;

      // Logging for debugging
      console.log('Cloudinary config:', {
        cloudName: this.cloudName || 'NOT SET',
        uploadPreset: this.uploadPreset || 'NOT SET',
      });

      if (!this.cloudName) {
        return {
          success: false,
          error:
            'Cloud name is not configured. Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME in your environment.',
        };
      }

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        return { success: false, error: 'File does not exist' };
      }

      // Get file extension
      const fileExtension = imageUri.split('.').pop() || 'jpg';

      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', `data:image/${fileExtension};base64,${base64}`);
      formData.append('upload_preset', this.uploadPreset);
      formData.append('folder', 'mindbook/profiles');
      formData.append('public_id', uniqueId);
      formData.append('timestamp', Date.now().toString());

      // Upload to Cloudinary
      console.log(`Uploading to Cloudinary (${this.cloudName}) with publicId: ${uniqueId}`);
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      // Get full response for debugging
      const responseText = await response.text();
      console.log(`Cloudinary response status: ${response.status}`);

      let result;
      try {
        // Try to parse as JSON
        result = JSON.parse(responseText);
        console.log('Cloudinary response:', result);
      } catch (e) {
        console.error('Failed to parse response as JSON:', responseText);
        return {
          success: false,
          error: `Invalid response: ${responseText.substring(0, 100)}...`,
        };
      }

      if (!response.ok) {
        console.error('Cloudinary upload error:', result);
        return {
          success: false,
          error: result.error?.message || `Upload failed with status ${response.status}`,
        };
      }

      console.log('Cloudinary upload success:', result.public_id);

      // Update user metadata with the new profile image
      await this.updateUserMetadata(userId, result.public_id, result.secure_url);

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      console.error('Error in uploadProfileImage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during upload',
      };
    }
  }

  /**
   * Updates the user metadata with the new profile image
   * @param userId - User ID
   * @param publicId - Cloudinary public ID
   * @param imageUrl - Cloudinary image URL
   */
  private async updateUserMetadata(
    userId: string,
    publicId: string,
    imageUrl: string
  ): Promise<void> {
    try {
      // Update Supabase user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          avatar_public_id: publicId,
          profile_image_url: imageUrl,
          cloudinary_url: imageUrl,
          last_image_update: Date.now(),
        },
      });

      if (error) {
        console.error('Error updating user metadata:', error);
        throw error;
      }

      console.log('User metadata updated successfully');

      // Force a session refresh to get updated metadata
      await supabase.auth.refreshSession();
    } catch (error) {
      console.error('Error in updateUserMetadata:', error);
      throw error;
    }
  }

  /**
   * Removes a profile image
   * @param userId - User ID
   * @returns Promise with the result
   */
  async removeProfileImage(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Removing profile image for user: ${userId}`);

      // First get the current publicId from user metadata
      const { data } = await supabase.auth.getUser();
      const publicId = data.user?.user_metadata?.avatar_public_id;

      if (publicId) {
        // Call existing Edge Function to delete from Cloudinary
        try {
          console.log(`Calling delete-from-cloudinary Edge Function for publicId: ${publicId}`);

          const { error: fnError } = await supabase.functions.invoke('delete-from-cloudinary', {
            body: {
              publicId,
              userId,
            },
          });

          if (fnError) {
            console.error('Error calling delete-from-cloudinary:', fnError);
          } else {
            console.log('Image successfully deleted from Cloudinary via Edge Function');
          }
        } catch (deleteError) {
          console.error('Error deleting from Cloudinary:', deleteError);
          // Continue anyway to clean up metadata
        }
      }

      // Update user metadata to remove profile image
      const { error } = await supabase.auth.updateUser({
        data: {
          avatar_public_id: '',
          profile_image_url: '',
          cloudinary_url: '',
          last_image_update: Date.now(),
        },
      });

      if (error) {
        console.error('Error removing profile image metadata:', error);
        return { success: false, error: error.message };
      }

      // Force a session refresh
      await supabase.auth.refreshSession();

      return { success: true };
    } catch (error) {
      console.error('Error in removeProfileImage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during removal',
      };
    }
  }

  /**
   * Gets the profile image URL with cache busting
   * @param publicId - Cloudinary public ID
   * @param width - Desired width
   * @param height - Desired height
   * @returns The transformed image URL
   */
  getProfileImageUrl(publicId: string, width: number = 250, height: number = 250): string | null {
    if (!publicId || !this.cloudName) return null;

    // Add timestamp for cache busting
    const timestamp = Date.now();

    // Create URL with transformations
    return `https://res.cloudinary.com/${this.cloudName}/image/upload/c_fill,g_face,h_${height},w_${width},q_auto,f_auto/${publicId}?t=${timestamp}`;
  }
}

// Create and export a singleton instance
export const cloudinaryService = new CloudinaryService();

// Export types for components
export type ProfileImageUploadResult = {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
};
