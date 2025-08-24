// Image Generation Service - Clean Architecture
// Handles AI-powered image generation for cover images

export interface ImageGenerationConfig {
  width?: number;
  height?: number;
  model?: 'flux' | 'sdxl' | 'stable-diffusion';
  seed?: number;
  style?: string;
}

export interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export interface ImagePromptAnalysis {
  success: boolean;
  prompt?: string;
  error?: string;
}

// Abstract interface for image generation providers
export interface IImageProvider {
  generateImage(prompt: string, config?: ImageGenerationConfig): Promise<ImageGenerationResponse>;
  validatePrompt(prompt: string): boolean;
}

// Pollinations AI Provider Implementation
export class PollinationsProvider implements IImageProvider {
  private readonly baseUrl = 'https://image.pollinations.ai/prompt';
  
  async generateImage(prompt: string, config: ImageGenerationConfig = {}): Promise<ImageGenerationResponse> {
    try {
      if (!this.validatePrompt(prompt)) {
        return {
          success: false,
          error: 'Invalid prompt: must be non-empty string'
        };
      }

      const {
        width = 800,
        height = 400, 
        model = 'flux',
        seed,
        style
      } = config;

      // Enhance prompt with style if provided
      const enhancedPrompt = style ? `${prompt}, ${style}` : prompt;
      
      // Build query parameters for Pollinations AI
      const params = new URLSearchParams({
        width: width.toString(),
        height: height.toString(),
        model,
        nologo: 'true',
        private: 'true'
      });
      
      if (seed) params.append('seed', seed.toString());
      
      // Pollinations format: https://image.pollinations.ai/prompt/{prompt}?width=800&height=400
      const imageUrl = `${this.baseUrl}/${encodeURIComponent(enhancedPrompt)}?${params.toString()}`;
      
      console.log('Generated image URL:', imageUrl);
      console.log('Enhanced prompt:', enhancedPrompt);
      
      // Skip validation for now - Pollinations URLs work differently
      return {
        success: true,
        imageUrl
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate image'
      };
    }
  }

  validatePrompt(prompt: string): boolean {
    return typeof prompt === 'string' && prompt.trim().length > 0 && prompt.length <= 1000;
  }

  private async validateImageUrl(url: string): Promise<boolean> {
    try {
      // Simple HEAD request to check if image exists
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      // If validation fails, assume URL is valid (Pollinations is usually reliable)
      return true;
    }
  }
}

// Main Image Generation Service (Facade Pattern)
export class ImageGenerationService {
  private provider: IImageProvider;

  constructor(provider: IImageProvider = new PollinationsProvider()) {
    this.provider = provider;
  }

  // Generate image from direct prompt
  async generateFromPrompt(prompt: string, config?: ImageGenerationConfig): Promise<ImageGenerationResponse> {
    return this.provider.generateImage(prompt, config);
  }

  // Generate image optimized for cover use
  async generateCoverImage(prompt: string, style: string = 'digital art, clean, professional'): Promise<ImageGenerationResponse> {
    const coverConfig: ImageGenerationConfig = {
      width: 800,
      height: 400,
      model: 'flux',
      style
    };

    return this.provider.generateImage(prompt, coverConfig);
  }

  // Change provider (Strategy Pattern)
  setProvider(provider: IImageProvider): void {
    this.provider = provider;
  }

  // Factory method for different image types
  static createForCover(): ImageGenerationService {
    return new ImageGenerationService(new PollinationsProvider());
  }
}

// Export singleton instance
export const imageGenerationService = ImageGenerationService.createForCover();