import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import useNotesWithAI from '../hooks/useNotesWithAI';
import { useTheme } from '../context/ThemeContext';
import { themeColors } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import { saveNoteAnalyze, getNoteAnalyzes, deleteNoteAnalyze } from '../utils/noteAnalyzeStorage';

interface NoteAIAnalyzerProps {
  noteId?: string;
  noteIds?: string[];
  onClose: () => void;
  visible: boolean;
}

const NoteAIAnalyzer: React.FC<NoteAIAnalyzerProps> = ({ noteId, noteIds, onClose, visible }) => {
  const { t } = useTranslation();
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { theme, accentColor } = useTheme();
  const [analyzeHistory, setAnalyzeHistory] = useState([]);

  const { analyzeNoteWithAI, analyzeMultipleNotes, generateContentSuggestions } = useNotesWithAI();

  const stopRequested = useRef(false);

  // Markdown styles for AI response
  const markdownStyles = {
    body: {
      color: theme.text,
      fontSize: 16,
    },
    heading1: {
      color: theme.text,
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 8,
      marginTop: 12,
    },
    code_block: {
      backgroundColor: theme.background,
      borderColor: theme.border,
      borderRadius: 5,
      borderWidth: 1,
      marginVertical: 5,
      padding: 10,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
  };

  // Copy to clipboard function
  const handleCopy = async () => {
    if (aiResponse) {
      await Clipboard.setStringAsync(aiResponse);
      Alert.alert(t('common.copied'), t('aiAssistant.copiedToClipboard'));
    }
  };

  useEffect(() => {
    if (visible) {
      setAiResponse('');
      setCustomPrompt('');
    }
  }, [visible]);

  useEffect(() => {
    if (visible && noteId) {
      getNoteAnalyzes(noteId).then(setAnalyzeHistory);
    }
  }, [visible, noteId]);

  const handleAnalyze = async (prompt?: string) => {
    setIsLoading(true);
    setAiResponse(''); // Clear previous response
    stopRequested.current = false;

    try {
      let responseStream;
      const userPromptText = prompt || customPrompt;

      if (noteIds && noteIds.length > 1) {
        if (!userPromptText.trim()) {
          setAiResponse(t('aiAssistant.error'));
          return;
        }
        responseStream = await analyzeMultipleNotes(noteIds, userPromptText);
      } else if (noteId) {
        if (!userPromptText.trim()) {
          setAiResponse(t('aiAssistant.error'));
          return;
        }
        responseStream = await analyzeNoteWithAI(noteId, userPromptText);
      } else {
        responseStream = await generateContentSuggestions();
      }

      if (responseStream.error || !responseStream.stream) {
        throw new Error(responseStream.error || 'Stream not available');
      }

      // Process the stream
      let fullResponse = '';
      for await (const chunk of responseStream.stream) {
        if (stopRequested.current) break;
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          setAiResponse(fullResponse);
        }
      }

      // If no content was streamed, show a fallback message
      if (!fullResponse) {
        setAiResponse(t('aiAssistant.noResponse') || 'Yanıt alınamadı.');
      }
      // --- Save analyze result if noteId exists and there is a response ---
      if (noteId && fullResponse) {
        await saveNoteAnalyze(noteId, {
          date: new Date().toISOString(),
          prompt: userPromptText,
          response: fullResponse,
        });
        setAnalyzeHistory(await getNoteAnalyzes(noteId));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAiResponse(`${t('aiAssistant.error')}: ${errorMessage}`);
      console.error('AI analysis error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopAI = () => {
    stopRequested.current = true;
    setIsLoading(false);
  };

  const handleDeleteAnalyze = async idx => {
    if (!noteId) return;
    await deleteNoteAnalyze(noteId, idx);
    setAnalyzeHistory(await getNoteAnalyzes(noteId));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      presentationStyle="fullScreen"
    >
      <StatusBar barStyle="light-content" backgroundColor={themeColors[accentColor]} />
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: themeColors[accentColor],
            paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 15,
          },
        ]}
      >
        <View style={[styles.header, { backgroundColor: themeColors[accentColor] }]}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {noteIds && noteIds.length > 1
              ? t('aiAssistant.analyzeMultipleNotes')
              : noteId
              ? t('aiAssistant.analyzeNote')
              : t('aiAssistant.generateIdeas')}
          </Text>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => handleAnalyze()}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Ionicons name="flash-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.container, { backgroundColor: theme.background }]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Custom Prompt Input */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t('aiAssistant.customPrompt')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder={t('aiAssistant.enterPrompt')}
                placeholderTextColor={theme.textSecondary}
                value={customPrompt}
                onChangeText={setCustomPrompt}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Suggestions Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t('aiAssistant.suggestions')}
              </Text>

              <View style={styles.suggestionGrid}>
                <TouchableOpacity
                  style={[
                    styles.suggestionCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  onPress={() => handleAnalyze(t('aiAssistant.summarizeNote'))}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <View
                    style={[
                      styles.suggestionIcon,
                      { backgroundColor: themeColors[accentColor] + '20' },
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={24}
                      color={themeColors[accentColor]}
                    />
                  </View>
                  <Text style={[styles.suggestionCardTitle, { color: theme.text }]}>
                    {t('aiAssistant.summarizeNote')}
                  </Text>
                  <Text style={[styles.suggestionCardDesc, { color: theme.textSecondary }]}>
                    {t('aiAssistant.summarizeNoteDesc', 'Create a concise summary')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.suggestionCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  onPress={() => handleAnalyze(t('aiAssistant.extractMainIdeas'))}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <View
                    style={[
                      styles.suggestionIcon,
                      { backgroundColor: themeColors[accentColor] + '20' },
                    ]}
                  >
                    <Ionicons name="bulb-outline" size={24} color={themeColors[accentColor]} />
                  </View>
                  <Text style={[styles.suggestionCardTitle, { color: theme.text }]}>
                    {t('aiAssistant.extractMainIdeas')}
                  </Text>
                  <Text style={[styles.suggestionCardDesc, { color: theme.textSecondary }]}>
                    {t('aiAssistant.extractMainIdeasDesc', 'Extract key concepts')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.suggestionCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  onPress={() => handleAnalyze(t('aiAssistant.expandTopic'))}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <View
                    style={[
                      styles.suggestionIcon,
                      { backgroundColor: themeColors[accentColor] + '20' },
                    ]}
                  >
                    <Ionicons name="expand-outline" size={24} color={themeColors[accentColor]} />
                  </View>
                  <Text style={[styles.suggestionCardTitle, { color: theme.text }]}>
                    {t('aiAssistant.expandTopic')}
                  </Text>
                  <Text style={[styles.suggestionCardDesc, { color: theme.textSecondary }]}>
                    {t('aiAssistant.expandTopicDesc', 'Elaborate on this subject')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.suggestionCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                  onPress={() => handleAnalyze(t('aiAssistant.listKeywords'))}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <View
                    style={[
                      styles.suggestionIcon,
                      { backgroundColor: themeColors[accentColor] + '20' },
                    ]}
                  >
                    <Ionicons name="pricetag-outline" size={24} color={themeColors[accentColor]} />
                  </View>
                  <Text style={[styles.suggestionCardTitle, { color: theme.text }]}>
                    {t('aiAssistant.listKeywords')}
                  </Text>
                  <Text style={[styles.suggestionCardDesc, { color: theme.textSecondary }]}>
                    {t('aiAssistant.listKeywordsDesc', 'Extract important keywords')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Geçmiş Analizler */}
            {analyzeHistory.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Geçmiş Analizler</Text>
                {analyzeHistory.map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      marginBottom: 8,
                      padding: 8,
                      backgroundColor: theme.card,
                      borderRadius: 8,
                      position: 'relative',
                    }}
                  >
                    <TouchableOpacity
                      style={{ position: 'absolute', top: 4, right: 4, zIndex: 10, padding: 4 }}
                      onPress={() => handleDeleteAnalyze(idx)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={themeColors.red} />
                    </TouchableOpacity>
                    <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{item.date}</Text>
                    <Text style={{ color: theme.text, fontWeight: 'bold' }}>{item.prompt}</Text>
                    <Markdown style={markdownStyles}>{item.response}</Markdown>
                  </View>
                ))}
              </View>
            )}

            {/* Response Section */}
            <View style={styles.section}>
              <View style={styles.responseHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {t('aiAssistant.aiResponse')}
                </Text>
                {isLoading && !aiResponse ? (
                  <ActivityIndicator size="small" color={themeColors[accentColor]} />
                ) : null}
              </View>

              <View
                style={[
                  styles.responseContainer,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                {/* Copy button */}
                {aiResponse ? (
                  <TouchableOpacity
                    style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}
                    onPress={handleCopy}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="copy-outline" size={22} color={theme.textSecondary} />
                  </TouchableOpacity>
                ) : null}
                <ScrollView
                  style={styles.responseScrollView}
                  contentContainerStyle={styles.responseContent}
                >
                  <Markdown style={markdownStyles}>
                    {aiResponse || t('aiAssistant.welcome')}
                  </Markdown>
                </ScrollView>
              </View>
            </View>
          </ScrollView>

          {/* Action Button */}
          <View
            style={[
              styles.footer,
              { backgroundColor: theme.background, borderTopColor: theme.border },
            ]}
          >
            {isLoading ? (
              <TouchableOpacity
                style={[styles.analyzeButton, { backgroundColor: themeColors.red }]}
                onPress={handleStopAI}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.analyzeButtonText}>{t('common.cancel') || 'Durdur'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.analyzeButton, { backgroundColor: themeColors[accentColor] }]}
                onPress={() => handleAnalyze()}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="flash" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.analyzeButtonText}>{t('aiAssistant.analyze')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  analyzeButton: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    width: '100%',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  container: {
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    elevation: 3,
    flexDirection: 'row',
    height: 60,
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerButton: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitle: {
    color: '#fff',
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 100,
    padding: 16,
    textAlignVertical: 'top',
  },
  responseContainer: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 200,
  },
  responseContent: {
    padding: 16,
  },
  responseHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  responseScrollView: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    gap: 24,
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  suggestionCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
    width: '48%',
  },
  suggestionCardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  suggestionCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  suggestionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  suggestionIcon: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginBottom: 12,
    width: 48,
  },
});

export default NoteAIAnalyzer;
