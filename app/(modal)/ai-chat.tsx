// This file is part of the "AI Assistant" module of the app.
// It provides a chat interface for users to interact with an AI assistant.
// The AI assistant can respond in different styles: poem, brief, or default.
import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';

// Message type definition
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
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
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>('poem'); // Default to poem style
  const { theme, themeColors, accentColor } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    const userPrompt = inputText;
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputText('');

    // Temporary message for AI response
    const aiMessageId = (Date.now() + 1).toString();

    // Add empty AI message (will be updated as response comes in)
    setMessages(prevMessages => [
      ...prevMessages,
      {
        id: aiMessageId,
        text: '',
        isUser: false,
        timestamp: new Date(),
      },
    ]);

    setIsLoading(true);

    // Getting the API endpoint from environment variables
    const apiUrl = Constants.expoConfig?.extra?.aiGenerateEndpoint || '';
    // Extract the server address from the API URL (just take the host:port part)
    const apiEndpoint = apiUrl.replace(/\/generate$/, '');

    console.log(`Making API request to ${apiEndpoint}... Style: ${responseStyle}`);

    try {
      // Progressive response API call
      const response = await fetch(`${apiEndpoint}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userPrompt,
          max_length: 80, // Reduced maximum token count
          progressive: true,
          style: responseStyle, // Poem or brief response mode
        }),
      });

      console.log('API response received, status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get initial response
      const initialData = await response.json();
      console.log('Initial response received, completed:', initialData.completed);

      // Show first part immediately
      setMessages(prevMessages =>
        prevMessages.map(message =>
          message.id === aiMessageId ? { ...message, text: initialData.generated_text } : message
        )
      );

      // If response is not complete (usually incomplete), continue with polling
      if (!initialData.completed && initialData.generation_id) {
        const generationId = initialData.generation_id;
        let isCompleted = false;

        // Polling section - check response every 500ms
        while (!isCompleted) {
          await new Promise(resolve => setTimeout(resolve, 500));

          try {
            console.log(`Checking ongoing response: ${generationId.slice(0, 8)}...`);
            const continueResponse = await fetch(
              `${apiEndpoint}/continue_generation/${generationId}`,
              {
                method: 'GET',
              }
            );

            if (!continueResponse.ok) {
              console.warn('Polling request failed:', continueResponse.status);
              continue;
            }

            const continueData = await continueResponse.json();
            console.log('Polling response received, completed:', continueData.completed);

            // Show current response
            setMessages(prevMessages =>
              prevMessages.map(message =>
                message.id === aiMessageId
                  ? { ...message, text: continueData.generated_text }
                  : message
              )
            );

            // Check completion
            if (continueData.completed) {
              console.log('Response completed');
              isCompleted = true;
            }
          } catch (pollError) {
            console.error('Polling error:', pollError);
            // Continue even if there's an error, it might fix in next attempt
          }
        }
      }

      console.log('Response process completed');
    } catch (error) {
      console.error('AI request failed:', error);

      // Update AI message in case of error
      setMessages(prevMessages =>
        prevMessages.map(message =>
          message.id === aiMessageId
            ? { ...message, text: t('aiAssistant.error') + ' ' + String(error) }
            : message
        )
      );
    } finally {
      setIsLoading(false);
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
      // Poem format indicator: has line breaks and
      // has "Phi-1.5" signature or many line breaks
      (item.text.split('\n').length >= 3 || item.text.includes('Phi-1.5'));

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
            : styles.aiMessage,
        ]}
      >
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
              { backgroundColor: inputText.trim() ? themeColors[accentColor] : theme.border },
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
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
  },
  container: {
    flex: 1,
  },
  headerIcon: {
    marginTop: -36,
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
