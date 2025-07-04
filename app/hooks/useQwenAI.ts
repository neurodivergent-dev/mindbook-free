import { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import OpenRouterService, { AIResponse } from '../utils/openRouterService';
import { getOpenRouterApiKey } from '../utils/secureKeyService';

interface UseQwenAIOptions {
  autoInit?: boolean;
  defaultSystemPrompt?: string;
}

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
  }

  // Try to access directly from process.env
  if (typeof process !== 'undefined' && process.env && key in process.env) {
    return process.env[key] || '';
  }

  if (key === 'OPENROUTER_MODEL') {
    return 'qwen/qwen2.5-vl-72b-instruct:free';
  }

  return '';
};

/**
 * Hook for using the Qwen AI model through OpenRouter
 */
export const useQwenAI = (options: UseQwenAIOptions = {}) => {
  const { autoInit = true, defaultSystemPrompt } = options;

  const [service, setService] = useState<OpenRouterService | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the service
  useEffect(() => {
    if (autoInit) {
      initializeService();
    }
  }, [autoInit]);

  const initializeService = async () => {
    try {
      // Get API key from Edge Function
      const apiKey = await getOpenRouterApiKey();

      if (!apiKey) {
        setError('OpenRouter API key could not be retrieved from secure storage');
        // console.error('OpenRouter API key is missing. Could not retrieve from secure storage.'); // Devre dışı bırakıldı
        return;
      }

      console.log('✅ API key successfully retrieved for useQwenAI');
      const model = getEnvVariable('OPENROUTER_MODEL');

      const newService = new OpenRouterService(
        apiKey,
        'Mindbook',
        'https://mindbookpro.shop',
        model
      );
      setService(newService);
      setError(null);
    } catch (err) {
      setError('Failed to initialize OpenRouter service');
      console.error('Failed to initialize OpenRouter service:', err);
    }
  };

  /**
   * Ask a text question to the AI
   */
  const askQuestion = async (
    prompt: string,
    systemPrompt: string = defaultSystemPrompt || ''
  ): Promise<AIResponse> => {
    if (!service) {
      // Try to initialize the service if it's not already initialized
      await initializeService();

      // If still not initialized, return error
      if (!service) {
        const error = 'OpenRouter service is not initialized';
        console.error(error);
        return { content: '', error };
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Always request a stream from the service
      const response = await service.askQuestion(prompt, systemPrompt, true);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return { content: '', error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Analyze an image with the AI
   */
  const analyzeImage = async (
    imageUrl: string,
    question: string = 'What is in this image?'
  ): Promise<AIResponse> => {
    if (!service) {
      // Try to initialize the service if it's not already initialized
      await initializeService();

      // If still not initialized, return error
      if (!service) {
        const error = 'OpenRouter service is not initialized';
        console.error(error);
        return { content: '', error };
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Always request a stream from the service
      const response = await service.analyzeImage(imageUrl, question, true);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return { content: '', error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initialize the service manually (if autoInit is false)
   */
  const initService = async (apiKey?: string, model?: string) => {
    try {
      // If no API key is provided, try to get it from Edge Function
      const finalApiKey = apiKey || (await getOpenRouterApiKey());

      if (!finalApiKey) {
        setError('OpenRouter API key is missing');
        return false;
      }

      const newService = new OpenRouterService(
        finalApiKey,
        'Mindbook',
        'https://mindbookpro.shop',
        model
      );
      setService(newService);
      setError(null);
      return true;
    } catch (err) {
      setError('Failed to initialize OpenRouter service');
      console.error('Failed to initialize OpenRouter service:', err);
      return false;
    }
  };

  return {
    askQuestion,
    analyzeImage,
    initService,
    loading,
    error,
    isInitialized: !!service,
  };
};

// Only keep the default export
export default useQwenAI;
