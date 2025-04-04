// Project: AI Assistant Component
// Description: This component allows users to interact with an AI assistant by sending prompts and receiving generated text.
import { useState } from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const AIAssistant = ({ onResultGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, themeColors, accentColor } = useTheme();
  const { t } = useTranslation();

  const generateText = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const apiUrl = Constants.expoConfig?.extra?.aiGenerateEndpoint;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          max_length: 300,
        }),
      });

      const data = await response.json();
      setLoading(false);

      // We pass the result to the parent component
      if (onResultGenerated) {
        onResultGenerated(data.generated_text);
      }

      setPrompt('');
    } catch (error) {
      console.error('Error generating AI text:', error);
      setLoading(false);
      // You can handle the error condition
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={t('Ask your AI assistant...')}
          placeholderTextColor={theme.textSecondary}
          value={prompt}
          onChangeText={setPrompt}
          multiline
        />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: themeColors[accentColor] }]}
          onPress={generateText}
          disabled={loading || !prompt.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Styles for the component
const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    marginLeft: 10,
    width: 40,
  },
  container: {
    margin: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 40,
  },
  inputContainer: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 10,
  },
});

export default AIAssistant;
