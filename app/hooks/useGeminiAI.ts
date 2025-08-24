import { useState, useEffect } from 'react';
import { geminiService } from '../services/gemini';

interface UseGeminiAIOptions {
  autoInit?: boolean;
  defaultSystemPrompt?: string;
}

interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Hook for using Gemini Flash 2.5 AI model
 */
export const useGeminiAI = (options: UseGeminiAIOptions = {}) => {
  const { autoInit = true, defaultSystemPrompt } = options;

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
      // Check if Gemini service is configured
      if (!geminiService.isConfigured()) {
        setError('Gemini API key not configured. Please add your key to app/config/ai.ts');
        return;
      }

      setError(null);
      console.log('✅ Gemini AI service initialized successfully');
    } catch (err) {
      setError('Failed to initialize Gemini service');
      console.error('Failed to initialize Gemini service:', err);
    }
  };

  const askQuestion = async (
    question: string,
    responseStyle: 'poem' | 'brief' | 'default' = 'default'
  ): Promise<AIResponse> => {
    try {
      setLoading(true);
      setError(null);

      let prompt = question;
      
      // Add style-specific instructions
      switch (responseStyle) {
        case 'poem':
          prompt = `Write a creative poem about: ${question}`;
          break;
        case 'brief':
          prompt = `Give a brief, concise answer to: ${question}`;
          break;
        case 'default':
        default:
          prompt = `Provide a helpful and informative response to: ${question}`;
          break;
      }

      const response = await geminiService.generateContent(prompt);
      
      if (response.success && response.content) {
        return {
          success: true,
          content: response.content
        };
      } else {
        return {
          success: false,
          error: response.error || 'Failed to generate response'
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  const analyzeImage = async (
    imageBase64: string,
    question: string = 'What do you see in this image?'
  ): Promise<AIResponse> => {
    try {
      setLoading(true);
      setError(null);

      const response = await geminiService.analyzeContentForImage(imageBase64);
      
      if (response.success && response.content) {
        return {
          success: true,
          content: response.content
        };
      } else {
        return {
          success: false,
          error: response.error || 'Failed to analyze image'
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    askQuestion,
    analyzeImage,
    loading,
    error,
    initializeService
  };
};

export default useGeminiAI;
