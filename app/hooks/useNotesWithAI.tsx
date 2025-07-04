import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getAllNotes, Note } from '../utils/storage';
import useQwenAI from './useQwenAI';
import { AIResponse } from '../utils/openRouterService';

/**
 * Hook to integrate notes with AI capabilities
 * Allows sending notes to AI for analysis, summarization, etc.
 */

export const useNotesWithAI = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const {
    askQuestion,
    loading: aiLoading,
    error: aiError,
    isInitialized: isAiInitialized,
  } = useQwenAI();

  // Load all notes
  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const allNotes = await getAllNotes();
      setNotes(allNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  /**
   * Send a specific note to AI for analysis
   * @param noteId - ID of the note to analyze
   * @param prompt - Optional custom prompt to use with the note
   * @returns AI response
   */
  const analyzeNoteWithAI = async (noteId: string, prompt?: string): Promise<AIResponse> => {
    if (!isAiInitialized) {
      return { content: '', error: t('aiAssistant.qwenAiError') };
    }

    const note = notes.find(n => n.id === noteId);
    if (!note) {
      return { content: '', error: t('notes.noteNotFound') };
    }

    try {
      const userPrompt = prompt || `Analyze this note: ${note.title}`;
      const message = `${userPrompt}\n\nNote Title: ${note.title}\nNote Content: ${note.content}`;

      const systemPrompt =
        "You are a note analysis expert. Analyze the user's notes and provide helpful insights.";
      const response = await askQuestion(message, systemPrompt);
      return response;
    } catch (error) {
      console.error('AI analysis error:', error);
      return { content: '', error: t('aiAssistant.error') };
    }
  };

  /**
   * Analyze multiple notes together
   * @param noteIds - Array of note IDs to analyze together
   * @param prompt - Custom prompt for analysis
   * @returns AI response
   */
  const analyzeMultipleNotes = async (noteIds: string[], prompt: string): Promise<AIResponse> => {
    if (!isAiInitialized) {
      return { content: '', error: t('aiAssistant.qwenAiError') };
    }

    const selectedNotes = notes.filter(note => noteIds.includes(note.id));
    if (selectedNotes.length === 0) {
      return { content: '', error: t('notes.noteNotFound') };
    }

    try {
      let notesText = '';
      selectedNotes.forEach((note, index) => {
        notesText += `Note ${index + 1}: "${note.title}"\n${note.content}\n\n`;
      });

      const systemPrompt =
        'You are a note analysis expert. Compare multiple notes and find connections between them.';
      const response = await askQuestion(`${prompt}\n\n${notesText}`, systemPrompt);
      return response;
    } catch (error) {
      console.error('AI multiple notes analysis error:', error);
      return { content: '', error: t('aiAssistant.error') };
    }
  };

  /**
   * Generate content suggestions based on existing notes
   * @param context - Optional context or topic for content generation
   * @returns AI response with content suggestions
   */
  const generateContentSuggestions = async (context?: string): Promise<AIResponse> => {
    if (!isAiInitialized) {
      return { content: '', error: t('aiAssistant.qwenAiError') };
    }

    try {
      // Get most recent notes (up to 5) for context
      const recentNotes = notes.slice(0, 5);
      let notesContext = '';

      if (recentNotes.length > 0) {
        notesContext = 'Here are some of my recent notes for context:\n\n';
        recentNotes.forEach((note, index) => {
          notesContext += `Note ${index + 1}: "${note.title}"\n${note.content.substring(
            0,
            200
          )}...\n\n`;
        });
      }

      const userContext = context ? `\nAdditional context: ${context}` : '';
      const message = `Based on the following notes, suggest some new ideas or topics I might want to write about. ${notesContext}${userContext}`;

      const systemPrompt =
        "You are a content creation expert. Suggest new ideas based on the user's existing notes.";
      const response = await askQuestion(message, systemPrompt);
      return response;
    } catch (error) {
      console.error('AI content suggestion error:', error);
      return { content: '', error: t('aiAssistant.error') };
    }
  };

  return {
    notes,
    loading,
    aiLoading,
    aiError,
    isAiInitialized,
    analyzeNoteWithAI,
    analyzeMultipleNotes,
    generateContentSuggestions,
    loadNotes,
  };
};

export default useNotesWithAI;
