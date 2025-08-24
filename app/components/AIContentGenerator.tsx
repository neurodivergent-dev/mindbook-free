import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { geminiService, GeminiResponse, ContentGenerationResponse } from '../services/gemini';
import { imageGenerationService, ImageGenerationResponse } from '../services/imageGeneration';

interface AIContentGeneratorProps {
  visible: boolean;
  onClose: () => void;
  onContentGenerated: (content: string, coverImageUrl?: string, title?: string) => void;
}

interface GeneratedContentHistory {
  id: string;
  prompt: string;
  content: string;
  title?: string;
  timestamp: number;
}

const AIContentGenerator: React.FC<AIContentGeneratorProps> = ({
  visible,
  onClose,
  onContentGenerated,
}) => {
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateImage, setGenerateImage] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [contentHistory, setContentHistory] = useState<GeneratedContentHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const { theme, themeColors, accentColor, fontSize, fontSizes, fontFamily, fontFamilies } = useTheme();
  const { t } = useTranslation();

  const STORAGE_KEY = 'ai_content_history';

  // Load content history from storage
  useEffect(() => {
    loadContentHistory();
  }, []);

  // Save current content when visible
  useEffect(() => {
    if (visible && generatedContent) {
      saveCurrentContent();
    }
  }, [generatedContent]);

  const loadContentHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const history = JSON.parse(stored) as GeneratedContentHistory[];
        setContentHistory(history);
      }
    } catch (error) {
      console.error('Error loading AI content history:', error);
    }
  };

  const saveContentHistory = async (history: GeneratedContentHistory[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      setContentHistory(history);
    } catch (error) {
      console.error('Error saving AI content history:', error);
    }
  };

  const saveCurrentContent = async () => {
    if (!prompt.trim() || !generatedContent.trim()) return;

    const newContent: GeneratedContentHistory = {
      id: Date.now().toString(),
      prompt: prompt.trim(),
      content: generatedContent.trim(),
      title: generatedTitle.trim() || undefined,
      timestamp: Date.now(),
    };

    const updatedHistory = [newContent, ...contentHistory.slice(0, 19)]; // Keep last 20
    await saveContentHistory(updatedHistory);
  };

  const clearHistory = async () => {
    Alert.alert(
      t('ai.clearHistory'),
      t('ai.clearHistoryConfirmation'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('ai.clear'),
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(STORAGE_KEY);
            setContentHistory([]);
          },
        },
      ]
    );
  };

  const loadFromHistory = (item: GeneratedContentHistory) => {
    setPrompt(item.prompt);
    setGeneratedContent(item.content);
    setShowHistory(false);
  };

  const quickPrompts = [
    { id: 1, text: t('ai.quickPrompts.article'), icon: 'document-text' },
    { id: 2, text: t('ai.quickPrompts.summary'), icon: 'list' },
    { id: 3, text: t('ai.quickPrompts.ideas'), icon: 'bulb' },
    { id: 4, text: t('ai.quickPrompts.story'), icon: 'book' },
    { id: 5, text: t('ai.quickPrompts.guide'), icon: 'map' },
  ];

  const generateContent = async () => {
    if (!prompt.trim()) {
      Alert.alert(t('common.warning'), t('ai.enterPrompt'));
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    setGeneratedTitle('');
    setGeneratedImageUrl('');
    setImageLoadError(false);

    try {
      // Step 1: Generate content with title
      const response: ContentGenerationResponse = await geminiService.generateContentWithTitle(prompt);
      
      if (response.success && response.content) {
        setGeneratedContent(response.content);
        if (response.title) {
          setGeneratedTitle(response.title);
        }
        
        // Step 2: Generate image if requested (non-blocking)
        if (generateImage) {
          generateCoverImageForContent(response.content);
        }
      } else {
        Alert.alert(t('common.error'), response.error || t('ai.generationError'));
      }
    } catch (error) {
      console.error('AI Content Generation Error:', error);
      Alert.alert(t('common.error'), t('ai.generationError'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Async function for generating cover image
  const generateCoverImageForContent = async (content: string) => {
    setIsGeneratingImage(true);
    
    try {
      // Step 1: Analyze content with Gemini to create image prompt
      const analysisResponse = await geminiService.analyzeContentForImage(content);
      
      if (analysisResponse.success && analysisResponse.content) {
        // Step 2: Generate image with Pollinations
        const imageResponse = await imageGenerationService.generateCoverImage(analysisResponse.content);
        
        if (imageResponse.success && imageResponse.imageUrl) {
          setGeneratedImageUrl(imageResponse.imageUrl);
        } else {
          console.error('Image generation failed:', imageResponse.error);
        }
      } else {
        console.error('Content analysis for image failed:', analysisResponse.error);
      }
    } catch (error) {
      console.error('Cover image generation error:', error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleUseContent = () => {
    if (generatedContent.trim()) {
      onContentGenerated(
        generatedContent, 
        generatedImageUrl || undefined, 
        generatedTitle || undefined
      );
      // Don't clear content, keep it for history
      onClose();
    }
  };

  const handleClose = () => {
    // Don't clear content, it's saved to history
    setShowHistory(false);
    onClose();
  };

  const dynamicStyles = {
    modalContainer: [styles.modalContainer, { backgroundColor: theme.background }],
    header: [styles.header, { borderBottomColor: theme.border }],
    headerTitle: [styles.headerTitle, { color: theme.text }],
    closeButton: { color: theme.text },
    promptInput: [
      styles.promptInput,
      {
        backgroundColor: theme.card,
        borderColor: theme.border,
        color: theme.text,
        fontSize: fontSizes[fontSize].contentSize,
        fontFamily: fontFamilies[fontFamily].family,
      },
    ],
    quickPromptButton: [
      styles.quickPromptButton,
      {
        backgroundColor: theme.card,
        borderColor: themeColors[accentColor] + '30',
      },
    ],
    quickPromptText: [
      styles.quickPromptText,
      {
        color: themeColors[accentColor],
        fontSize: fontSizes[fontSize].contentSize - 2,
      },
    ],
    generateButton: [
      styles.generateButton,
      {
        backgroundColor: isGenerating ? theme.border : themeColors[accentColor],
      },
    ],
    generateButtonText: [
      styles.generateButtonText,
      {
        fontSize: fontSizes[fontSize].contentSize,
        fontFamily: fontFamilies[fontFamily].family,
      },
    ],
    contentContainer: [styles.contentContainer, { backgroundColor: theme.card }],
    generatedText: [
      styles.generatedText,
      {
        color: theme.text,
        fontSize: fontSizes[fontSize].contentSize,
        fontFamily: fontFamilies[fontFamily].family,
      },
    ],
    useButton: [
      styles.useButton,
      {
        backgroundColor: themeColors[accentColor],
      },
    ],
    useButtonText: [
      styles.useButtonText,
      {
        fontSize: fontSizes[fontSize].contentSize,
        fontFamily: fontFamilies[fontFamily].family,
      },
    ],
    sectionTitle: [
      styles.sectionTitle,
      {
        color: theme.text,
        fontSize: fontSizes[fontSize].contentSize + 2,
        fontFamily: fontFamilies[fontFamily].family,
      },
    ],
    generatedTitle: [
      styles.generatedTitle,
      {
        color: theme.text,
        fontSize: fontSizes[fontSize].contentSize + 4,
        fontFamily: fontFamilies[fontFamily].family,
      },
    ],
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={dynamicStyles.modalContainer}>
        {/* Header */}
        <View style={dynamicStyles.header}>
          <View style={styles.headerLeft}>
            <Text style={dynamicStyles.headerTitle}>{t('ai.contentGenerator')}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              onPress={() => setShowHistory(!showHistory)}
              style={styles.historyButton}
            >
              <Ionicons 
                name="time-outline" 
                size={24} 
                color={themeColors[accentColor]} 
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={dynamicStyles.closeButton.color} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* History Section */}
          {showHistory && (
            <View style={styles.section}>
              <View style={styles.historyHeader}>
                <Text style={dynamicStyles.sectionTitle}>{t('ai.contentHistory')}</Text>
                {contentHistory.length > 0 && (
                  <TouchableOpacity onPress={clearHistory}>
                    <Text style={[styles.clearHistoryText, { color: themeColors[accentColor] }]}>
                      {t('ai.clear')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {contentHistory.length === 0 ? (
                <Text style={[styles.emptyHistoryText, { color: theme.textSecondary }]}>
                  {t('ai.noHistory')}
                </Text>
              ) : (
                <ScrollView style={styles.historyList} nestedScrollEnabled>
                  {contentHistory.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.historyItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onPress={() => loadFromHistory(item)}
                    >
                      <Text style={[styles.historyPrompt, { color: theme.text }]} numberOfLines={2}>
                        {item.prompt}
                      </Text>
                      <Text style={[styles.historyDate, { color: theme.textSecondary }]}>
                        {new Date(item.timestamp).toLocaleDateString()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Prompt Input */}
          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>{t('ai.whatToWrite')}</Text>
            <TextInput
              style={dynamicStyles.promptInput}
              placeholder={t('ai.promptPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              maxLength={500}
            />
          </View>

          {/* Quick Prompts */}
          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>{t('ai.quickPrompts.title')}</Text>
            <View style={styles.quickPromptsContainer}>
              {quickPrompts.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={dynamicStyles.quickPromptButton}
                  onPress={() => setPrompt(item.text)}
                >
                  <Ionicons 
                    name={item.icon as any} 
                    size={16} 
                    color={themeColors[accentColor]} 
                  />
                  <Text style={dynamicStyles.quickPromptText}>{item.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Image Generation Option */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.imageOptionContainer}
              onPress={() => setGenerateImage(!generateImage)}
            >
              <View style={styles.checkboxContainer}>
                <Ionicons 
                  name={generateImage ? 'checkbox' : 'square-outline'} 
                  size={20} 
                  color={themeColors[accentColor]} 
                />
                <Text style={[dynamicStyles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>
                  {t('ai.generateCoverImage')}
                </Text>
              </View>
              <Text style={[styles.imageOptionDescription, { color: theme.textSecondary }]}>
                {t('ai.generateCoverImageDesc')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Generate Button */}
          <TouchableOpacity
            style={dynamicStyles.generateButton}
            onPress={generateContent}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Ionicons name="sparkles" size={20} color="white" />
            )}
            <Text style={dynamicStyles.generateButtonText}>
              {isGenerating ? t('ai.generating') : t('ai.generate')}
            </Text>
          </TouchableOpacity>

          {/* Generated Content */}
          {generatedContent && (
            <View style={styles.section}>
              <Text style={dynamicStyles.sectionTitle}>{t('ai.generatedContent')}</Text>
              
              {/* Generated Title */}
              {generatedTitle && (
                <View style={styles.titlePreview}>
                  <Text style={[dynamicStyles.generatedTitle, { color: theme.text }]}>
                    {generatedTitle}
                  </Text>
                </View>
              )}
              
              {/* Generated Image Preview */}
              {generateImage && (
                <View style={styles.imagePreviewContainer}>
                  {isGeneratingImage ? (
                    <View style={[styles.imagePreview, styles.imageLoading, { backgroundColor: theme.card }]}>
                      <ActivityIndicator color={themeColors[accentColor]} size="small" />
                      <Text style={[styles.imageLoadingText, { color: theme.textSecondary }]}>
                        {t('ai.generatingImage')}
                      </Text>
                    </View>
                  ) : generatedImageUrl ? (
                    <View style={styles.imagePreviewContainer}>
                      <Text style={[styles.debugText, { color: theme.textSecondary }]}>
                        URL: {generatedImageUrl.substring(0, 60)}...
                      </Text>
                      {imageLoadError ? (
                        <View style={[styles.imageError, { backgroundColor: theme.card, borderColor: theme.border }]}>
                          <Ionicons name="image-outline" size={32} color={theme.textSecondary} />
                          <Text style={[styles.errorText, { color: theme.textSecondary }]}>
                            Resim yüklenemedi
                          </Text>
                          <TouchableOpacity 
                            style={[styles.retryButton, { backgroundColor: themeColors[accentColor] }]}
                            onPress={() => {
                              setImageLoadError(false);
                              // Force re-render image
                              const currentUrl = generatedImageUrl;
                              setGeneratedImageUrl('');
                              setTimeout(() => setGeneratedImageUrl(currentUrl), 100);
                            }}
                          >
                            <Text style={styles.retryText}>Tekrar Dene</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Image 
                          source={{ uri: generatedImageUrl }} 
                          style={styles.generatedImage}
                          resizeMode="contain"
                          onError={(error) => {
                            console.log('Image load error:', error.nativeEvent.error);
                            setImageLoadError(true);
                          }}
                          onLoad={() => {
                            console.log('Image loaded successfully');
                            setImageLoadError(false);
                          }}
                          onLoadStart={() => {
                            console.log('Image load started');
                          }}
                        />
                      )}
                    </View>
                  ) : null}
                </View>
              )}
              
              <View style={dynamicStyles.contentContainer}>
                <ScrollView style={styles.contentScroll} nestedScrollEnabled>
                  <Text style={dynamicStyles.generatedText}>{generatedContent}</Text>
                </ScrollView>
                <TouchableOpacity style={dynamicStyles.useButton} onPress={handleUseContent}>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={dynamicStyles.useButtonText}>{t('ai.useContent')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  promptInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  quickPromptsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickPromptText: {
    fontWeight: '500',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  generateButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  contentContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  contentScroll: {
    maxHeight: 300,
    padding: 16,
  },
  generatedText: {
    lineHeight: 22,
  },
  useButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  useButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  historyButton: {
    padding: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearHistoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyHistoryText: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  historyList: {
    maxHeight: 200,
  },
  historyItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyPrompt: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
  },
  imageOptionContainer: {
    padding: 0,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  imageOptionDescription: {
    fontSize: 12,
    marginLeft: 28,
    lineHeight: 16,
  },
  imagePreviewContainer: {
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  imageLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  imageLoadingText: {
    marginTop: 8,
    fontSize: 12,
  },
  generatedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  titlePreview: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  generatedTitle: {
    fontWeight: 'bold',
    lineHeight: 28,
    textAlign: 'center',
  },
  debugText: {
    fontSize: 10,
    marginBottom: 8,
    textAlign: 'center',
  },
  imageError: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 20,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AIContentGenerator;