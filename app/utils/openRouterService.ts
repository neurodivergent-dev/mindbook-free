import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import * as FileSystem from 'expo-file-system';
import { getOpenRouterApiKey } from './secureKeyService';

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
  }> | null;
};

// Helper function to safely access environment variables
const getEnvVariable = (key: string): string => {
  // Access Constants.expoConfig which is the recommended approach
  if (Constants.expoConfig?.extra && typeof Constants.expoConfig.extra === 'object') {
    const extra = Constants.expoConfig.extra as Record<string, any>;

    // Obfuscated key mapping
    const keyMap: Record<string, string> = {
      OPENROUTER_API_KEY: '_o',
      OPENROUTER_MODEL: '_om',
      SUPABASE_URL: '_s',
      SUPABASE_ANON_KEY: '_a',
      ENCRYPTION_KEY: '_e',
      VAULT_ENCRYPTION_KEY: '_v',
      GOOGLE_WEB_CLIENT_ID: '_g',
      GOOGLE_ANDROID_CLIENT_ID: '_ga',
      AI_GENERATE_ENDPOINT_PROD: '_ai',
      AI_GENERATE_ENDPOINT_DEV: '_ai',
      EXPO_DEV_HOST: '_ed',
      EXPO_DEV_PORT: '_ep',
    };

    // Try obfuscated key first
    const obfuscatedKey = keyMap[key];
    if (obfuscatedKey && obfuscatedKey in extra) {
      return extra[obfuscatedKey] as string;
    }

    // Try original key as fallback
    if (key in extra) {
      return extra[key] as string;
    }

    // Convert to camelCase for compatibility
    const camelKey =
      key.charAt(0).toLowerCase() + key.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (camelKey in extra) {
      return extra[camelKey] as string;
    }
  }

  // Try to access directly from process.env
  if (typeof process !== 'undefined' && process.env && key in process.env) {
    return process.env[key] || '';
  }

  // Fallback for model if not found
  if (key === 'OPENROUTER_MODEL') {
    return 'qwen/qwen2.5-vl-72b-instruct:free';
  }

  return '';
};

/**
 * Service to interact with AI models through OpenRouter
 */
export class OpenRouterService {
  private client: OpenAI | null = null;
  private defaultModel: string;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the OpenRouter service
   * @param apiKey - OpenRouter API key (will be fetched from Edge Function if not provided)
   * @param siteName - Your site name for analytics on OpenRouter
   * @param siteUrl - Your site URL for analytics on OpenRouter
   * @param model - The model to use (defaults to Qwen2.5-VL)
   */
  constructor(
    apiKey?: string,
    private siteName: string = 'Mindbook Pro',
    private siteUrl: string = 'https://mindbookpro.shop',
    model: string = getEnvVariable('OPENROUTER_MODEL') || 'qwen/qwen2.5-vl-72b-instruct:free'
  ) {
    this.defaultModel = model;

    // If API key is provided directly, initialize immediately
    if (apiKey) {
      this.initializeClient(apiKey);
    } else {
      // Otherwise defer initialization until first use
      this.initializationPromise = this.lazyInitialize();
    }
  }

  /**
   * Lazily initialize client with API key from Edge Function
   */
  private async lazyInitialize(): Promise<void> {
    try {
      console.log('🔄 OpenRouterService: Initializing with API key from secure storage...');

      // Fetch API key from Edge Function
      const apiKey = await getOpenRouterApiKey();

      if (!apiKey) {
        console.error('❌ OpenRouterService: API key is null or empty from secure storage');
        throw new Error('Failed to fetch OpenRouter API key from secure storage');
      }

      console.log(
        `✅ OpenRouterService: Successfully retrieved API key (${apiKey.substring(
          0,
          3
        )}...${apiKey.substring(apiKey.length - 3)})`
      );
      this.initializeClient(apiKey);
    } catch (error) {
      console.error(
        '❌ OpenRouterService initialization failed:',
        error instanceof Error ? error.message : error
      );

      // Fall back to environment variable as last resort
      const fallbackKey = getEnvVariable('OPENROUTER_API_KEY');

      if (fallbackKey) {
        console.warn(
          '⚠️ OpenRouterService: Using fallback API key from environment - this is less secure'
        );
        this.initializeClient(fallbackKey);
      } else {
        console.error('❌ OpenRouterService: No fallback API key available');
      }
    }
  }

  /**
   * Initialize OpenAI client with the provided API key
   */
  private initializeClient(apiKey: string): void {
    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }

    // Log key format for debugging (hiding most of the key)
    const keyFormat = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 5);
    console.log(`🔑 Initializing OpenRouter client with key format: ${keyFormat}`);
    console.log(`🔑 Key length: ${apiKey.length}, contains hyphens: ${apiKey.includes('-')}`);

    // Create a fetch wrapper that is compatible with the OpenAI library's type definition.
    const customFetch: typeof global.fetch = (input, init) => {
      // expo/fetch expects a string URL, so we need to handle Request objects.
      const url = typeof input === 'string' ? input : input.url;
      const options = init || (typeof input !== 'string' ? input : undefined);
      return fetch(url, options) as any;
    };

    try {
      // Initialize the OpenAI client with OpenRouter base URL
      this.client = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey,
        defaultHeaders: {
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.siteName,
        },
        fetch: customFetch, // Use the stream-supporting fetch from expo/fetch
        dangerouslyAllowBrowser: true,
      });

      this.isInitialized = true;
      console.log(`✅ OpenRouter Service initialized with model: ${this.defaultModel}`);
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI client:', error);
      throw error;
    }
  }

  /**
   * Ensure the client is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    if (this.initializationPromise) {
      await this.initializationPromise;
    } else {
      this.initializationPromise = this.lazyInitialize();
      await this.initializationPromise;
    }

    if (!this.isInitialized) {
      throw new Error('OpenRouter client initialization failed');
    }
  }

  /**
   * Send a general query to the Qwen2.5-VL model (supports both text and vision)
   * @param messages - Array of chat messages
   * @param stream - Whether to stream the response
   * @param options - Optional parameters for the model
   * @returns The model's response
   */
  async queryQwenModel(
    messages: ChatCompletionMessageParam[],
    stream: boolean = false
  ): Promise<AIResponse> {
    try {
      await this.ensureInitialized();

      if (!this.client) {
        throw new Error('OpenRouter client is not initialized');
      }

      if (stream) {
        // For streaming responses
        const params: any = {
          model: this.defaultModel,
          messages,
          stream: true,
          max_tokens: 1500,
          frequency_penalty: 0.6,
          presence_penalty: 0.6,
          temperature: 0.6,
          top_p: 0.95,
        };
        const streamCompletion = await this.client.chat.completions.create(params);

        // AsyncIterable olup olmadığını kontrol et
        const isAsyncIterable =
          typeof (streamCompletion as any)?.[Symbol.asyncIterator] === 'function';

        return {
          content: '',
          stream: isAsyncIterable
            ? (streamCompletion as unknown as AsyncIterable<{
                choices: { delta: { content?: string | null } }[];
              }>)
            : null,
        };
      } else {
        // For non-streaming responses
        const params: any = {
          model: this.defaultModel,
          messages,
          max_tokens: 1000,
          frequency_penalty: 0.5,
          presence_penalty: 0.5,
          temperature: 0.7,
          top_p: 0.95,
        };
        const completion = await this.client.chat.completions.create(params);
        return {
          content: completion.choices[0]?.message?.content || 'No response received',
        };
      }
    } catch (error) {
      console.error('Error calling OpenRouter API:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error calling OpenRouter';
      return { content: '', error: errorMessage };
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
        throw new Error('No image URL specified');
      }

      // Ensure the image URL is properly formatted for API consumption
      let formattedImageUrl = imageUrl;

      // Detect image format
      const fileExtension = imageUrl.split('.').pop()?.toLowerCase();
      console.log(`Image format detected: ${fileExtension}`);

      // Check if format is supported
      if (fileExtension && !['jpg', 'jpeg', 'png'].includes(fileExtension)) {
        console.warn(`Unsupported image format: ${fileExtension}`);
        throw new Error(`Unsupported image format: ${fileExtension}. Please use JPG or PNG.`);
      }

      // If it's a local file URI, convert to base64 data URL if needed
      if (imageUrl.startsWith('file://')) {
        console.log('Local image detected, converting to base64 URL');
        try {
          let mimeType = 'image/jpeg';
          if (fileExtension === 'png') mimeType = 'image/png';
          // Read file as base64 using FileSystem
          const base64 = await FileSystem.readAsStringAsync(imageUrl, {
            encoding: FileSystem.EncodingType.Base64,
          });
          formattedImageUrl = `data:${mimeType};base64,${base64}`;
          console.log(`Converted to base64 URL: ${formattedImageUrl.substring(0, 30)}...`);
          console.log(`Base64 length: ${base64.length}`);
        } catch (error) {
          console.error('Error converting image to base64:', error);
          throw new Error(
            error instanceof Error && error.message
              ? error.message
              : 'The image could not be processed. Please try another image.'
          );
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

      // Check message content
      if (content.length === 0) {
        throw new Error('Invalid message content: Text or image required');
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
        error: error instanceof Error ? error.message : 'Image could not be analyzed',
      };
    }
  }
}

export default OpenRouterService;
