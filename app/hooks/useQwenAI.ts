import { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import OpenRouterService, { AIResponse } from '../utils/openRouterService';

interface UseQwenAIOptions {
  autoInit?: boolean;
  defaultSystemPrompt?: string;
}

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
      const apiKey = getEnvVariable('OPENROUTER_API_KEY');
      const model = getEnvVariable('OPENROUTER_MODEL');

      if (!apiKey) {
        setError('OpenRouter API key is missing');
        console.error('OpenRouter API key is missing. Please add it to your .env file.');
        return;
      }

      try {
        const newService = new OpenRouterService(apiKey, 'Mindbook', 'https://mindbook.app', model);
        setService(newService);
        setError(null);
      } catch (err) {
        setError('Failed to initialize OpenRouter service');
        console.error('Failed to initialize OpenRouter service:', err);
      }
    }
  }, [autoInit]);

  /**
   * Ask a text question to the AI
   */
  const askQuestion = async (
    prompt: string,
    systemPrompt: string = defaultSystemPrompt || '',
    stream: boolean = false
  ): Promise<AIResponse> => {
    if (!service) {
      const error = 'OpenRouter service is not initialized';
      console.error(error);
      return { content: '', error };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await service.askQuestion(prompt, systemPrompt, stream);
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
    question: string = 'What is in this image?',
    stream: boolean = false
  ): Promise<AIResponse> => {
    if (!service) {
      const error = 'OpenRouter service is not initialized';
      console.error(error);
      return { content: '', error };
    }

    setLoading(true);
    setError(null);

    try {
      const response = await service.analyzeImage(imageUrl, question, stream);
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
  const initService = (apiKey: string, model?: string) => {
    try {
      const newService = new OpenRouterService(apiKey, 'Mindbook', 'https://mindbook.app', model);
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
