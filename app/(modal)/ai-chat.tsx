// This file is part of the "AI Assistant" module of the app.
// It provides a chat interface for users to interact with an AI assistant.
// The AI assistant can respond in different styles: poem, brief, or default.
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import useQwenAI from '../hooks/useQwenAI';

// Message type definition
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  imageUrl?: string;
}

// Response style types
type ResponseStyle = 'poem' | 'brief' | 'default';

export default function AIChatScreen() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: t('aiAssistant.welcome'),
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('default');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { theme, themeColors, accentColor } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  // Initialize Qwen AI
  const { askQuestion, analyzeImage, error } = useQwenAI();

  // Show error if API key is missing
  useEffect(() => {
    if (error) {
      console.error('Qwen AI Error:', error);
    }
  }, [error]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('aiAssistant.cameraPermissionDenied'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: false,
        exif: false,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedAsset = result.assets[0];
        const uri = selectedAsset.uri;

        console.log(`Selected image: ${uri}`);

        if (selectedAsset.fileSize && selectedAsset.fileSize > 10 * 1024 * 1024) {
          Alert.alert(
            t('common.error'),
            'The image size is too large (maximum 10MB). Please choose a smaller image.'
          );
          return;
        }

        const fileExtension = uri.split('.').pop()?.toLowerCase();

        if (fileExtension === 'png' || fileExtension === 'jpg' || fileExtension === 'jpeg') {
          console.log(`Selected image format: ${fileExtension}`);

          setSelectedImage(uri);

          Alert.alert(
            t('aiAssistant.imageUploaded'),
            'The image has been uploaded successfully. Now you can ask a question or press the submit button to analyze the image.',
            [{ text: 'Tamam', style: 'default' }]
          );
        } else {
          Alert.alert(
            t('common.error'),
            'Only PNG and JPEG formats are supported. Please choose another image.'
          );
          setSelectedImage(null);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        t('common.error'),
        'An error occurred while selecting the image. Please try again.'
      );
    }
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
  };

  const sendMessage = async () => {
    // Check for empty message
    if (!inputText.trim() && !selectedImage) {
      return;
    }

    setIsLoading(true);

    try {
      // Let's save the image temporarily
      const currentImage = selectedImage;

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        text: inputText || t('aiAssistant.imageUploaded'),
        isUser: true,
        timestamp: new Date(),
        imageUrl: currentImage || undefined,
      };

      setMessages(prev => [...prev, userMessage]);
      setInputText('');

      // Scroll message list to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Set system message
      const systemPrompt = getSystemPrompt();

      let response;

      // Image analysis or regular Q&A
      if (currentImage) {
        console.log('Sending image for analysis');
        response = await analyzeImage(currentImage, inputText || 'What is in this image?');
        // Clear the image from the input field but leave it in the message
        setSelectedImage(null);
      } else {
        console.log('Asking text question');
        response = await askQuestion(inputText, systemPrompt);
      }

      // Error checking
      if (response.error) {
        console.error('AI response error:', response.error);

        // Show error message to user
        const errorMessage: Message = {
          id: Date.now().toString(),
          text:
            response.error === 'OpenRouter service is not initialized'
              ? t('aiAssistant.qwenAiError')
              : `${t('aiAssistant.error')}: ${response.error}`,
          isUser: false,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, errorMessage]);
      } else {
        // Add successful response
        const aiMessage: Message = {
          id: Date.now().toString(),
          text: response.content || t('aiAssistant.error'),
          isUser: false,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, aiMessage]);
      }

      // Scroll message list to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);

      // Show error message to user
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: `${t('aiAssistant.error')}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function that determines the system message according to the response style
  const getSystemPrompt = (): string => {
    switch (responseStyle) {
      case 'poem':
        return 'You are a poet. Give your answers in verse format. Use poetic language and skip lines appropriately at the end of the line.';
      case 'brief':
        return 'Keep your answers short and concise. Use 2-3 sentences maximum.';
      case 'default':
      default:
        return 'You are a helpful AI assistant. Give detailed and accurate answers to questions.';
    }
  };

  // AI style toggle function
  const toggleResponseStyle = () => {
    // Cycle: Poem -> Brief -> Default -> Poem...
    setResponseStyle(prevStyle => {
      if (prevStyle === 'poem') return 'brief';
      if (prevStyle === 'brief') return 'default';
      return 'poem';
    });
  };

  // Helper function to get style name
  const getStyleName = () => {
    switch (responseStyle) {
      case 'poem':
        return t('aiAssistant.poemMode');
      case 'brief':
        return t('aiAssistant.briefMode');
      case 'default':
        return t('aiAssistant.defaultMode');
      default:
        return '';
    }
  };

  // Helper function to determine style icon
  const getStyleIcon = () => {
    switch (responseStyle) {
      case 'poem':
        return 'book-outline';
      case 'brief':
        return 'list-outline';
      case 'default':
        return 'chatbubble-outline';
      default:
        return 'book-outline';
    }
  };

  // Apply different styles based on message type (special format for poems)
  const renderMessage = ({ item }: { item: Message }) => {
    // Poem detection - based on content
    const isPoemStyle =
      !item.isUser &&
      responseStyle === 'poem' &&
      // Poem format indicator: has line breaks
      item.text.split('\n').length >= 3;

    // Display poem text preserving line breaks
    const formatPoemText = (text: string) => {
      // Split text into lines
      const lines = text.split('\n');

      // Return each line in a separate Text component
      return lines.map((line, index) => (
        <Text
          key={index}
          style={[
            styles.messageText,
            { color: theme.text },
            styles.poemText,
            line.trim() === '' ? styles.poemLine : {},
          ]}
        >
          {line.trim() === '' ? ' ' : line}
        </Text>
      ));
    };

    return (
      <View
        style={[
          styles.messageBubble,
          item.isUser
            ? [styles.userMessage, { backgroundColor: themeColors[accentColor] }]
            : [styles.aiMessage, { backgroundColor: theme.card, borderColor: theme.border }],
        ]}
      >
        {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />}
        {isPoemStyle ? (
          formatPoemText(item.text)
        ) : (
          <Text
            style={[styles.messageText, { color: item.isUser ? themeColors.white : theme.text }]}
          >
            {item.text}
          </Text>
        )}
        <Text
          style={[
            styles.timestamp,
            { color: item.isUser ? themeColors.white70 : theme.textSecondary },
          ]}
        >
          {item.timestamp.toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: themeColors[accentColor] },
          headerTintColor: '#fff',
          headerTitle: t('aiAssistant.title'),
          presentation: 'modal',
          headerBackVisible: true,
          headerRight: () => (
            <TouchableOpacity onPress={toggleResponseStyle} style={styles.styleToggle}>
              <Ionicons name={getStyleIcon()} size={22} color="#fff" style={styles.headerIcon} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Response style info */}
      <View style={[styles.styleInfo, { backgroundColor: themeColors[accentColor] + '20' }]}>
        <Ionicons name={getStyleIcon()} size={16} color={themeColors[accentColor]} />
        <Text style={[styles.styleText, { color: theme.text }]}>{getStyleName()}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={themeColors[accentColor]} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t('aiAssistant.thinking')}
          </Text>
        </View>
      )}

      {/* Selected image preview */}
      {selectedImage && (
        <View
          style={[
            styles.imagePreviewContainer,
            { backgroundColor: theme.card, borderTopColor: theme.border },
          ]}
        >
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.clearImageButton} onPress={clearSelectedImage}>
            <Ionicons name="close-circle" size={24} color={themeColors.red} />
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.card, borderColor: themeColors.black10 },
          ]}
        >
          <TouchableOpacity
            style={[styles.imageButton, { backgroundColor: theme.border }]}
            onPress={pickImage}
          >
            <Ionicons name="image-outline" size={20} color={theme.text} />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder={t('aiAssistant.placeholder')}
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim() || selectedImage ? themeColors[accentColor] : theme.border,
              },
            ]}
            onPress={sendMessage}
            disabled={(!inputText.trim() && !selectedImage) || isLoading}
          >
            <Ionicons name="send" size={20} color={themeColors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// AI Assistant chat screen styles
const styles = StyleSheet.create({
  aiMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  clearImageButton: {
    position: 'absolute',
    right: 5,
    top: 5,
    zIndex: 10,
  },
  container: {
    flex: 1,
  },
  headerIcon: {
    marginTop: -36,
  },
  imageButton: {
    borderRadius: 20,
    marginRight: 8,
    padding: 12,
  },
  imagePreview: {
    borderRadius: 10,
    height: 100,
    width: 100,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    borderTopWidth: 1,
    padding: 10,
  },
  input: {
    borderRadius: 20,
    flex: 1,
    fontSize: 16,
    marginRight: 8,
    padding: 12,
  },
  inputContainer: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 8,
  },
  loadingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  messageBubble: {
    borderRadius: 16,
    marginVertical: 4,
    maxWidth: '80%',
    padding: 12,
  },
  messageImage: {
    borderRadius: 8,
    height: 200,
    marginBottom: 8,
    resizeMode: 'cover',
    width: '100%',
  },
  messageList: {
    padding: 16,
    paddingBottom: 80,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  poemLine: {
    marginVertical: 8,
  },
  poemText: {
    textAlign: 'center',
  },
  sendButton: {
    borderRadius: 20,
    padding: 12,
  },
  styleInfo: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 6,
  },
  styleText: {
    fontSize: 14,
    marginLeft: 8,
  },
  styleToggle: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    padding: 8,
    position: 'absolute',
    right: 16,
    top: 16,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
});
