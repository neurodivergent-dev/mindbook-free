import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import Constants from 'expo-constants';

// Define types for our requests and responses
export type ImageContent = {
  type: 'image_url';
  image_url: {
    url: string;
  };
};

export type TextContent = {
  type: 'text';
  text: string;
};

export type MessageContent = TextContent | ImageContent;

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: MessageContent | MessageContent[];
};

export type AIResponse = {
  content: string;
  error?: string;
  stream?: AsyncIterable<{
    choices: {
      delta: {
        content?: string | null;
      };
    }[];
  }>;
};

// Helper function to safely access environment variables
const getEnvVariable = (key: string): string => {
  // Access Constants.expoConfig which is the recommended approach
  if (Constants.expoConfig?.extra && typeof Constants.expoConfig.extra === 'object') {
    const extra = Constants.expoConfig.extra as Record<string, any>;
    if (key in extra) {
      return extra[key] as string;
    }
  }

  // Try to access directly from process.env
  if (typeof process !== 'undefined' && process.env && key in process.env) {
    return process.env[key] || '';
  }

  // Hardcoded fallback for critical values
  if (key === 'OPENROUTER_API_KEY') {
    return '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';
  }

  if (key === 'OPENROUTER_MODEL') {
    return 'qwen/qwen2.5-vl-72b-instruct:free';
  }

  return '';
};

/**
 * Service to interact with AI models through OpenRouter
 */
export class OpenRouterService {
  private client: OpenAI;
  private defaultModel: string;
  private apiKey: string;

  /**
   * Initialize the OpenRouter service
   * @param apiKey - OpenRouter API key
   * @param siteName - Your site name for analytics on OpenRouter
   * @param siteUrl - Your site URL for analytics on OpenRouter
   * @param model - The model to use (defaults to Qwen2.5-VL)
   */
  constructor(
    apiKey: string = getEnvVariable('OPENROUTER_API_KEY'),
    siteName: string = 'Mindbook',
    siteUrl: string = 'https://mindbook.app',
    model: string = getEnvVariable('OPENROUTER_MODEL') || 'qwen/qwen2.5-vl-72b-instruct:free'
  ) {
    if (!apiKey) {
      throw new Error('OpenRouter API key is missing');
    }

    this.apiKey = apiKey;
    this.defaultModel = model;

    console.log(`OpenRouter Service initialized with model: ${model}`);

    // Initialize the OpenAI client with OpenRouter base URL
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      defaultHeaders: {
        'HTTP-Referer': siteUrl,
        'X-Title': siteName,
      },
      dangerouslyAllowBrowser: true,
    });
  }

  /**
   * Send a general query to the Qwen2.5-VL model (supports both text and vision)
   * @param messages - Array of chat messages
   * @param stream - Whether to stream the response
   * @returns The model's response
   */
  async queryQwenModel(
    messages: ChatCompletionMessageParam[],
    stream: boolean = false
  ): Promise<AIResponse> {
    try {
      // Giriş kontrolü
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error('Geçersiz mesaj formatı: Mesajlar boş olamaz');
      }

      console.log(`Sending request to OpenRouter API with model: ${this.defaultModel}`);
      console.log(`Messages count: ${messages.length}`);

      // Görüntü içeren mesajlar için özel işleme
      const hasImage = messages.some(msg => {
        if (msg && typeof msg.content === 'object' && Array.isArray(msg.content)) {
          return msg.content.some(
            content => typeof content === 'object' && content !== null && 'image_url' in content
          );
        }
        return false;
      });

      if (hasImage) {
        console.log('Request contains image content');

        // Görüntü içeren mesajları kontrol et (tip güvenli bir şekilde)
        // Not: messages'ı doğrudan değiştirmek yerine kopyasını oluşturup işleyelim
        const processedMessages = [...messages];

        for (let i = 0; i < processedMessages.length; i++) {
          const msg = processedMessages[i];

          if (!msg || !msg.content) {
            console.warn('Invalid message found, skipping:', msg);
            continue;
          }

          if (typeof msg.content === 'object' && Array.isArray(msg.content)) {
            // TypeScript'e bu içeriğin bir dizi olduğunu bildiriyoruz
            const contentArray = msg.content as Array<any>;

            for (let j = 0; j < contentArray.length; j++) {
              const content = contentArray[j];

              if (!content) {
                console.warn('Invalid content item found, skipping');
                continue;
              }

              if (typeof content === 'object' && content !== null && 'image_url' in content) {
                const imageUrl = content.image_url?.url;

                if (!imageUrl) {
                  console.warn('Image URL is missing');
                  continue;
                }

                // Base64 formatını kontrol et
                if (typeof imageUrl === 'string' && imageUrl.startsWith('data:image/')) {
                  console.log('Processing base64 image URL');

                  // URL'nin doğru formatını kontrol et
                  if (!imageUrl.includes('base64,')) {
                    console.warn('Invalid base64 image format');
                  }
                }
              }
            }
          }
        }
      }

      if (stream) {
        // For streaming responses
        const streamCompletion = await this.client.chat.completions.create({
          model: this.defaultModel,
          messages: messages,
          stream: true,
          max_tokens: 1000,
        });

        return {
          content: '',
          stream: streamCompletion,
        };
      } else {
        // For non-streaming responses
        console.log('Sending request to OpenRouter API...');
        const completion = await this.client.chat.completions.create({
          model: this.defaultModel,
          messages: messages,
          max_tokens: 1000,
        });

        console.log(
          `Response received: ${completion.choices[0]?.message?.content?.substring(0, 50)}...`
        );
        return {
          content: completion.choices[0]?.message?.content || 'No response received',
        };
      }
    } catch (error) {
      console.error('Error calling OpenRouter API:', error);

      // Try with direct fetch as fallback
      try {
        console.log('Attempting fallback with direct fetch API call');

        // Mesajları kontrol et ve temizle
        const safeMessages = messages
          .map(msg => {
            if (!msg) return null;

            // İçerik bir dizi ise her öğeyi kontrol et
            if (msg.content && Array.isArray(msg.content)) {
              return {
                ...msg,
                content: msg.content.filter(item => item != null),
              };
            }

            return msg;
          })
          .filter(msg => msg !== null);

        const requestBody = {
          model: this.defaultModel,
          messages: safeMessages,
          max_tokens: 1000,
        };

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://mindbook.app',
            'X-Title': 'Mindbook',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`OpenRouter API error: ${response.status} - ${errorText}`);

          // Görüntü formatı hatası için özel mesaj
          if (errorText.includes('InvalidParameter.DataInspection')) {
            throw new Error(
              'Görüntü formatı desteklenmiyor. Lütfen PNG veya JPEG formatında bir görüntü kullanın.'
            );
          }

          throw new Error(`${response.status} ${errorText}`);
        }

        const data = await response.json();
        return {
          content: data.choices[0]?.message?.content || 'No response received',
        };
      } catch (fallbackError) {
        console.error('Fallback API call also failed:', fallbackError);
        return {
          content: '',
          error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error occurred',
        };
      }
    }
  }

  /**
   * Send a text-only query to the Qwen model
   * @param prompt - The text prompt to send
   * @param systemPrompt - Optional system prompt for context
   * @param stream - Whether to stream the response
   * @returns The model's response
   */
  async askQuestion(
    prompt: string,
    systemPrompt?: string,
    stream: boolean = false
  ): Promise<AIResponse> {
    const messages: ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    return this.queryQwenModel(messages, stream);
  }

  /**
   * Analyze an image with optional text prompt
   * @param imageUrl - URL of the image to analyze
   * @param question - Question about the image
   * @param stream - Whether to stream the response
   * @returns The model's analysis of the image
   */
  async analyzeImage(
    imageUrl: string,
    question: string = 'What is in this image?',
    stream: boolean = false
  ): Promise<AIResponse> {
    try {
      console.log(`Analyzing image: ${imageUrl?.substring(0, 30)}...`);

      if (!imageUrl) {
        throw new Error("Görüntü URL'si belirtilmedi");
      }

      // Ensure the image URL is properly formatted for API consumption
      let formattedImageUrl = imageUrl;

      // Detect image format
      const fileExtension = imageUrl.split('.').pop()?.toLowerCase();
      console.log(`Image format detected: ${fileExtension}`);

      // Check if format is supported
      if (fileExtension && !['jpg', 'jpeg', 'png'].includes(fileExtension)) {
        console.warn(`Unsupported image format: ${fileExtension}`);
        throw new Error(
          `Desteklenmeyen görüntü formatı: ${fileExtension}. Lütfen JPG veya PNG kullanın.`
        );
      }

      // If it's a local file URI, convert to base64 data URL if needed
      if (imageUrl.startsWith('file://')) {
        console.log('Local image detected, converting to base64 URL');

        // For OpenRouter, we need to ensure the image is accessible via URL
        // We'll use a data URL format which is widely supported
        try {
          // Fetch the image as blob and convert to base64
          const response = await fetch(imageUrl);

          if (!response.ok) {
            throw new Error(`Görüntü yüklenemedi: ${response.status} ${response.statusText}`);
          }

          const blob = await response.blob();

          if (blob.size === 0) {
            throw new Error('Görüntü verisi boş');
          }

          if (blob.size > 10 * 1024 * 1024) {
            // 10MB limit
            throw new Error('Görüntü boyutu çok büyük (maksimum 10MB)');
          }

          // Determine MIME type based on file extension
          let mimeType = 'image/jpeg'; // Default
          if (imageUrl.toLowerCase().endsWith('.png')) {
            mimeType = 'image/png';
          } else if (
            imageUrl.toLowerCase().endsWith('.jpg') ||
            imageUrl.toLowerCase().endsWith('.jpeg')
          ) {
            mimeType = 'image/jpeg';
          }

          // Convert to base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64data = reader.result as string;
              resolve(base64data);
            };
            reader.onerror = () => {
              reject(new Error('Görüntü base64 formatına dönüştürülemedi'));
            };
            reader.readAsDataURL(blob);
          });

          formattedImageUrl = base64;
          console.log(`Converted to base64 URL: ${base64.substring(0, 30)}...`);
          console.log(`Base64 length: ${base64.length}`);
        } catch (error) {
          console.error('Error converting image to base64:', error);
          throw new Error('Görüntü işlenemedi. Lütfen başka bir görüntü deneyin.');
        }
      }

      // Güvenli mesaj oluşturma
      const content: any[] = [];

      // Metin ekle
      if (question) {
        content.push({
          type: 'text',
          text: question,
        });
      }

      // Görüntü ekle
      if (formattedImageUrl) {
        content.push({
          type: 'image_url',
          image_url: {
            url: formattedImageUrl,
          },
        });
      }

      // Mesaj içeriği kontrol et
      if (content.length === 0) {
        throw new Error('Geçersiz mesaj içeriği: Metin veya görüntü gerekli');
      }

      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'user',
          content: content,
        },
      ];

      return this.queryQwenModel(messages, stream);
    } catch (error) {
      console.error('Error in analyzeImage:', error);
      return {
        content: '',
        error: error instanceof Error ? error.message : 'Görüntü analiz edilemedi',
      };
    }
  }
}

export default OpenRouterService;
