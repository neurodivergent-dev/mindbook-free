import React, { useState, useEffect } from 'react';
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
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import useNotesWithAI from '../hooks/useNotesWithAI';
import { useTheme } from '../context/ThemeContext';
import { themeColors } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

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

  const { analyzeNoteWithAI, analyzeMultipleNotes, generateContentSuggestions } = useNotesWithAI();

  useEffect(() => {
    if (visible) {
      setAiResponse('');
      setCustomPrompt('');
    }
  }, [visible]);

  const handleAnalyze = async (prompt?: string) => {
    setIsLoading(true);
    try {
      let response;

      // Validate inputs
      if (noteIds && noteIds.length > 1) {
        // For multiple notes
        const userPrompt = prompt || customPrompt || t('aiAssistant.compareNotesDefault');
        if (!userPrompt.trim()) {
          setAiResponse(t('aiAssistant.error'));
          return;
        }
        response = await analyzeMultipleNotes(noteIds, userPrompt);
      } else if (noteId) {
        // For single note
        const userPrompt = prompt || customPrompt;
        if (!userPrompt.trim()) {
          setAiResponse(t('aiAssistant.error'));
          return;
        }
        response = await analyzeNoteWithAI(noteId, userPrompt);
      } else {
        // Generate content suggestions
        response = await generateContentSuggestions();
      }

      setAiResponse(response.content || response);
    } catch (error) {
      setAiResponse(t('aiAssistant.error'));
      console.error('AI analysis error:', error);
    } finally {
      setIsLoading(false);
    }
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

            {/* Response Section */}
            <View style={styles.section}>
              <View style={styles.responseHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {t('aiAssistant.aiResponse')}
                </Text>
                {isLoading && <ActivityIndicator size="small" color={themeColors[accentColor]} />}
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
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={themeColors[accentColor]} />
                    <Text style={[styles.loadingText, { color: theme.text }]}>
                      {t('aiAssistant.thinking')}
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.responseScrollView}
                    contentContainerStyle={styles.responseContent}
                  >
                    <Text style={[styles.responseText, { color: theme.text }]}>
                      {aiResponse || t('aiAssistant.welcome')}
                    </Text>
                  </ScrollView>
                )}
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
            <TouchableOpacity
              style={[styles.analyzeButton, { backgroundColor: themeColors[accentColor] }]}
              onPress={() => handleAnalyze()}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="flash" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.analyzeButtonText}>{t('aiAssistant.analyze')}</Text>
                </>
              )}
            </TouchableOpacity>
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
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
  responseText: {
    fontSize: 16,
    lineHeight: 24,
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
