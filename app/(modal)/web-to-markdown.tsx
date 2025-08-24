import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  ActivityIndicator,
  Share,
  Clipboard,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showToast as androidShowToast } from '../utils/android';
import { geminiService } from '../services/gemini';

const formatPmfIasMarkdown = (content: string, url: string): string => {
  return content
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{3,}/g, ' ')
    .trim();
};

export default function WebToMarkdownConverter() {
  const [url, setUrl] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [preserveCodeExamples, setPreserveCodeExamples] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const router = useRouter();
  const { theme, themeColors, accentColor, fontSize, fontSizes, fontFamily, fontFamilies } =
    useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const markdownRef = useRef(null);

  const validateUrl = (inputUrl: string) => {
    try {
      const urlObj = new URL(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`);
      return urlObj.href;
    } catch {
      return null;
    }
  };

  const removeCodeBlocks = (
    htmlContent: string,
    preserveEducationalCode: boolean = false
  ): string => {
    let content = htmlContent;

    // 1. HTML Code Tags - Only remove obvious code containers
    content = content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Always remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ''); // Always remove styles

    // Only remove explicit code blocks if not preserving educational content
    if (!preserveEducationalCode) {
      // Only remove <pre> and <code> tags that are clearly code examples
      content = content
        .replace(/<pre[^>]*class[^>]*code[^>]*>[\s\S]*?<\/pre>/gi, '') // Only code-classed pre tags
        .replace(/<code[^>]*class[^>]*language[^>]*>[\s\S]*?<\/code>/gi, ''); // Only language-specific code tags
    }

    // 2. Programming Keywords
    const programmingKeywords = [
      'function',
      'const',
      'let',
      'var',
      'class',
      'def',
      'int',
      'string',
      'import',
      'export',
      'require',
      'from',
      'return',
      'throw',
      'catch',
      'if\\s*\\(',
      'for\\s*\\(',
      'while\\s*\\(',
      'switch\\s*\\(',
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'CREATE',
    ];

    // 3. Analyze each line for code patterns
    const lines = content.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return true; // Keep empty lines

      // Calculate special character density
      const specialChars = (trimmedLine.match(/[{}();[\]<>=!&|+\-*/.]/g) || []).length;
      const specialDensity = specialChars / trimmedLine.length;

      // Check for code indicators - more lenient if preserving educational content
      const codeIndicators = {
        // High special character density
        highSpecialDensity: specialDensity > (preserveEducationalCode ? 0.5 : 0.3),

        // Programming keywords (2+ in same line, or 3+ if preserving educational)
        multipleKeywords:
          programmingKeywords.filter(keyword =>
            new RegExp(`\\b${keyword}\\b`, 'i').test(trimmedLine)
          ).length >= (preserveEducationalCode ? 3 : 2),

        // Consecutive special characters
        consecutiveSpecial: /[{}();[\]]{3,}/.test(trimmedLine),

        // Ends with semicolon and has programming syntax (skip simple examples if educational)
        codeEnding:
          !preserveEducationalCode &&
          trimmedLine.endsWith(';') &&
          programmingKeywords.some(keyword =>
            new RegExp(`\\b${keyword}\\b`, 'i').test(trimmedLine)
          ),

        // Object/JSON syntax (be more lenient for educational content)
        objectSyntax:
          !preserveEducationalCode &&
          (/\{\s*["']?\w+["']?\s*:\s*["']?[\w\s]+["']?\s*\}/.test(trimmedLine) ||
            /["']\w+["']\s*:\s*["'][\w\s]+["']/.test(trimmedLine)),

        // Array syntax (be more lenient for educational content)
        arraySyntax:
          !preserveEducationalCode &&
          /\[\s*["'][\w\s]+["']\s*,\s*["'][\w\s]+["']\s*\]/.test(trimmedLine),

        // Method chaining (2+ dots)
        methodChaining:
          (trimmedLine.match(/\./g) || []).length >= 2 && /\w+\.\w+\.\w+/.test(trimmedLine),

        // File paths
        filePaths:
          /^[\/.~].*\.(js|ts|css|html|php|py|java|cpp|c|h)$/i.test(trimmedLine) ||
          /^(\.\/|\.\.\/|\/[a-zA-Z])/.test(trimmedLine),

        // Command line syntax
        commandLine: /^[\$>]\s+\w+/.test(trimmedLine),

        // Comments (always remove these)
        comments: /^(\/\/|\/\*|\*\/|#|<!--)/.test(trimmedLine),

        // Version numbers in technical context
        technicalVersions: /v?\d+\.\d+\.\d+/.test(trimmedLine) && specialDensity > 0.1,

        // Heavy indentation with code syntax (more lenient threshold for educational)
        indentedCode:
          /^\s{4,}/.test(line) &&
          (specialDensity > (preserveEducationalCode ? 0.4 : 0.2) ||
            programmingKeywords.some(keyword =>
              new RegExp(`\\b${keyword}\\b`, 'i').test(trimmedLine)
            )),
      };

      // Check for human content indicators
      const humanIndicators = {
        // Complete sentences (ends with . ! ?)
        completeSentence: /[.!?]\s*$/.test(trimmedLine) && trimmedLine.length > 10,

        // Natural language flow (articles, prepositions)
        naturalLanguage: /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/.test(
          trimmedLine.toLowerCase()
        ),

        // Proper capitalization
        properCapitalization: /^[A-Z][a-z]/.test(trimmedLine),

        // Question or explanation
        explanatory: /^(What|How|Why|When|Where|This|These|That|Those)\b/i.test(trimmedLine),
      };

      // Calculate confidence scores
      const codeScore = Object.values(codeIndicators).filter(Boolean).length;
      const humanScore = Object.values(humanIndicators).filter(Boolean).length;

      // More lenient decision logic - prefer keeping content
      const codeThreshold = preserveEducationalCode ? 6 : 5; // Much higher threshold
      const likelyCodeThreshold = preserveEducationalCode ? 4 : 3;

      if (codeScore >= codeThreshold) return false; // Very obviously code
      if (codeScore >= likelyCodeThreshold && humanScore === 0 && trimmedLine.length < 50)
        return false; // Short likely code with no human indicators
      if (humanScore >= 1 && codeScore <= 2) return true; // Any human content with low code score
      if (trimmedLine.length > 50) return true; // Long lines are usually content, not code

      // Edge cases - strongly prefer keeping content
      if (trimmedLine.length < 3) return false; // Very short, likely noise
      if (preserveEducationalCode) return true; // In educational mode, keep almost everything

      return codeScore <= humanScore; // Keep if equal or more human indicators
    });

    content = filteredLines.join('\n');

    // 4. Clean up UI spam but preserve meaningful content
    const spamTexts = [
      'Enter fullscreen mode',
      'Exit fullscreen mode',
      'Subscribe',
      'Follow',
      'Share on Twitter',
      'Share on Facebook',
      'Dropdown menu',
      "What's a billboard\\?",
      'Manage preferences',
      'Report billboard',
      'Top comments',
      'Personal Trusted User',
      'Templates let you quickly answer',
      'Submit Preview',
      'Code of Conduct',
      'Report abuse',
      'Are you sure you want to hide',
      'It will become hidden',
      'Hide child comments',
      'Confirm',
      'For further actions',
      'blocking this person',
      'reporting abuse',
      'Promoted',
      'MiniMax',
      'AI Agent Challenge',
      'Developer-first embedded',
      'Build Smarter, Remix Bolder',
      'Win Bigger',
      'Embed in minutes',
      'load in milliseconds',
      'extend infinitely',
    ];

    spamTexts.forEach(text => {
      content = content.replace(new RegExp(`\\b${text}\\b`, 'gi'), '');
    });

    // 5. Clean up artifacts but preserve content
    content = content
      .replace(/!\[\]\s*\(\s*\)/g, '') // Empty image links
      .replace(/\[\]\s*\(\s*\)/g, '') // Empty links
      .replace(/!\[pic\]\s*\(\s*\)/g, '') // ![pic]() patterns
      .replace(/!\[profile\]\s*\(\s*\)/g, '') // ![profile]() patterns
      .replace(/!\[.*?profile.*?\]\s*\([^)]*\)/gi, '') // Profile images with URLs
      .replace(/!\[Cover image.*?\]\s*\([^)]*\)/gi, '') // Cover images with URLs
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{3,}/g, ' ')
      .trim();

    return content;
  };

  const convertToMarkdown = async () => {
    if (isProcessing) {
      return;
    }

    if (!url.trim()) {
      Alert.alert(t('common.error'), 'Please enter a valid URL');
      return;
    }

    const validUrl = validateUrl(url.trim());
    if (!validUrl) {
      Alert.alert(t('common.error'), 'Please enter a valid URL');
      return;
    }

    setIsProcessing(true);
    setIsLoading(true);
    setError('');
    setMarkdown('');

    try {
      // AI-powered extraction if enabled
      if (useAI) {
        try {
          setError('Trying AI extraction (may fallback if busy)...');

          // First, get the raw HTML
          let htmlResponse;
          try {
            htmlResponse = await fetch(validUrl, {
              method: 'GET',
              headers: {
                Accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                Connection: 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0',
              },
            });
          } catch (corsError) {
            // Fallback to CORS proxy if direct fetch fails
            htmlResponse = await fetch(`https://cors-anywhere.herokuapp.com/${validUrl}`, {
              method: 'GET',
              headers: {
                Accept:
                  'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest',
              },
            });
          }

          if (!htmlResponse.ok) {
            throw new Error(`Failed to fetch webpage: ${htmlResponse.status}`);
          }

          const htmlContent = await htmlResponse.text();

          // Enhanced AI extraction with better instructions
          setError(t('webToMarkdown.aiExtracting'));

          // Use regular Gemini to extract clean content
          const aiResult = await geminiService.extractContent(htmlContent, validUrl);

          if (aiResult.success && aiResult.content) {
            setMarkdown(aiResult.content);
            setError('');
            return; // Exit early if AI extraction succeeds
          } else {
            setError(`${t('webToMarkdown.aiFallback')}: ${aiResult.error}`);
            // Fall through to standard extraction
          }
        } catch (aiError) {
          console.error('AI extraction error:', aiError);
          const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown AI error';
          setError(`${t('webToMarkdown.aiFallback')}: ${errorMessage}`);
          // Fall through to standard extraction
        }
      }

      // Standard extraction (fallback or primary method)
      let response;
      let data;

      try {
        // Skip Microlink to avoid content truncation - force HTML fallback
        throw new Error('Skipping Microlink for full content extraction');
      } catch (microlinkError) {
        // Fallback: Direkt HTML fetch ve basit parsing

        const corsController = new AbortController();
        const corsTimeoutId = setTimeout(() => corsController.abort(), 15000);

        response = await fetch(`https://cors-anywhere.herokuapp.com/${validUrl}`, {
          method: 'GET',
          headers: {
            Accept: 'text/html',
            'X-Requested-With': 'XMLHttpRequest',
          },
          signal: corsController.signal,
        });

        clearTimeout(corsTimeoutId);

        if (!response.ok) {
          // Son çare: proxy olmadan dene (CORS hatası alabilir)
          const directController = new AbortController();
          const directTimeoutId = setTimeout(() => directController.abort(), 10000);

          response = await fetch(validUrl, {
            method: 'GET',
            headers: {
              Accept: 'text/html',
            },
            signal: directController.signal,
          });

          clearTimeout(directTimeoutId);
        }

        const html = await response.text();

        // Basit HTML parsing
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descriptionMatch = html.match(
          /<meta[^>]*name=['""]description['""][^>]*content=['""]([^'"]*)['""][^>]*>/i
        );

        // Gelişmiş kod temizliği
        let content = removeCodeBlocks(html, preserveCodeExamples);

        // Site-spesifik content selector'ları
        let articleMatch;

        // Dev.to için özel selector
        if (validUrl.includes('dev.to')) {
          articleMatch =
            content.match(/<div[^>]*id=['""]article-body['""][^>]*>([\s\S]*?)<\/div>/i) ||
            content.match(/<div[^>]*class[^>]*article-body[^>]*>([\s\S]*?)<\/div>/i) ||
            content.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
        }
        // Medium için özel selector - daha geniş coverage
        else if (validUrl.includes('medium.com')) {
          articleMatch =
            content.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
            content.match(/<div[^>]*class[^>]*postArticle-content[^>]*>([\s\S]*?)<\/div>/i) ||
            content.match(/<div[^>]*class[^>]*story-content[^>]*>([\s\S]*?)<\/div>/i) ||
            content.match(/<section[^>]*data-field="body"[^>]*>([\s\S]*?)<\/section>/i) ||
            content.match(/<div[^>]*class[^>]*medium-content[^>]*>([\s\S]*?)<\/div>/i);
        }
        // Genel selector
        else {
          articleMatch = content.match(
            /<(?:article|main|div[^>]*class[^>]*(?:content|post|article|entry))[^>]*>([\s\S]*?)<\/(?:article|main|div)>/i
          );
        }

        // HTML'i temizle ve text'e çevir - fallback olarak body'nin tamamını al
        let extractedContent;
        if (articleMatch) {
          extractedContent = articleMatch[1];
        } else {
          // Fallback: body içeriğini al, navigation/footer hariç
          const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch) {
            extractedContent = bodyMatch[1];
          } else {
            extractedContent = content; // Son fallback: tüm HTML
          }
        }

        // Gelişmiş HTML'den Markdown'a dönüştürme
        extractedContent = extractedContent
          .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n\n')
          .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n\n')
          .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n\n')
          .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n\n')
          .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n\n')
          .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n\n')
          .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
          .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
          .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
          .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
          .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '\n```\n$1\n```\n')
          .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '\n> $1\n')
          .replace(/<ul[^>]*>/gi, '\n')
          .replace(/<\/ul>/gi, '\n')
          .replace(/<ol[^>]*>/gi, '\n')
          .replace(/<\/ol>/gi, '\n')
          .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
          .replace(/<a[^>]*href=['""]([^'"]*)['""][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
          .replace(
            /<img[^>]*alt=['""]([^'"]*)['""][^>]*src=['""]([^'"]*)['""][^>]*>/gi,
            '![$1]($2)'
          )
          .replace(/<p[^>]*>(.*?)<\/p>/gis, '\n$1\n\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<div[^>]*>/gi, '\n')
          .replace(/<\/div>/gi, '\n')
          .replace(/<[^>]*>/g, '') // Kalan HTML taglarını kaldır

          // HTML entities
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#\d+;/g, '')

          // Son temizlik
          .replace(/\n{3,}/g, '\n\n')
          .replace(/\s{3,}/g, ' ')
          .trim();

        // İçerik zaten bir kez temizlendi, tekrar aggressive cleaning yapma

        data = {
          status: 'success',
          data: {
            title: titleMatch ? titleMatch[1].trim() : '',
            content: extractedContent,
            description: descriptionMatch ? descriptionMatch[1] : '',
            author: '',
            publishedTime: '',
          },
        };
      }

      if (data.status === 'success') {
        const { title, content, description, author, publishedTime } = data.data;

        // Markdown formatında birleştir
        let markdownContent = '';

        if (title) markdownContent += `# ${title}\n\n`;
        if (author) markdownContent += `**Author:** ${author}\n\n`;
        if (publishedTime)
          markdownContent += `**Published:** ${new Date(publishedTime).toLocaleDateString()}\n\n`;
        if (description) markdownContent += `**Description:** ${description}\n\n`;
        markdownContent += `**Source:** [${validUrl}](${validUrl})\n\n---\n\n`;

        if (content) {
          // HTML içeriği var mı kontrol et - eğer HTML tagları varsa dönüştür
          const hasHtmlTags = /<[^>]+>/.test(content);

          let cleanContent = content;

          if (hasHtmlTags) {
            // HTML'den Markdown'a dönüştürme
            cleanContent = content
              .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
              .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
              .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
              .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
              .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
              .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
              .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
              .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
              .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
              .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
              .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
              .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
              .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
              .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')
              .replace(/<ul[^>]*>/gi, '')
              .replace(/<\/ul>/gi, '\n')
              .replace(/<ol[^>]*>/gi, '')
              .replace(/<\/ol>/gi, '\n')
              .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
              .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
              .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
              .replace(/<pre[^>]*>(.*?)<\/pre>/gi, '```\n$1\n```\n\n')
              .replace(/<br\s*\/?>/gi, '\n')
              .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
              .replace(/\n{3,}/g, '\n\n') // Clean up multiple newlines
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .trim();
          }

          // İçerik zaten temizlendi, fazla aggressive cleaning yapma

          // PMF IAS için özel formatlama
          if (validUrl.includes('pmfias.com')) {
            cleanContent = formatPmfIasMarkdown(cleanContent, validUrl);
          }

          markdownContent += cleanContent;
        } else {
          markdownContent += `Content could not be extracted from this webpage.

Possible reasons:
- The website may have anti-scraping measures
- The content might be loaded dynamically with JavaScript
- The website structure may have changed
- Network or CORS issues

For websites that use dynamic content loading, try:
1. Using the AI extraction option
2. Copying content manually and pasting it directly
3. Checking if the website has an API or RSS feed available`;
        }

        setMarkdown(markdownContent);
      } else {
        throw new Error(data.message || 'Failed to fetch webpage content');
      }
    } catch (error) {
      console.error('Error converting webpage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`${t('webToMarkdown.convertingError')}: ${errorMessage}`);
      Alert.alert(t('common.error'), `${t('webToMarkdown.convertingError')}: ${errorMessage}`);
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async () => {
    if (!markdown) return;

    try {
      await Clipboard.setString(markdown);
      androidShowToast(t('webToMarkdown.copiedToClipboard'));
    } catch (error) {
      Alert.alert(t('common.error'), t('webToMarkdown.copyFailed'));
    }
  };

  const shareMarkdown = async () => {
    if (!markdown) return;

    try {
      await Share.share({
        message: markdown,
        title: t('webToMarkdown.convertedTitle'),
      });
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to share content');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Custom Header */}
      <View
        style={[
          styles.customHeader,
          { backgroundColor: themeColors[accentColor], paddingTop: insets.top + 16 },
        ]}
      >
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { fontFamily: fontFamilies[fontFamily].family }]}>
            {t('webToMarkdown.title')}
          </Text>
        </View>

        <View style={styles.headerBackButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* URL Input Section */}
        <View style={styles.inputSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Enter Website URL</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.urlInput,
                {
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  fontSize: fontSizes[fontSize].contentSize,
                  fontFamily: fontFamilies[fontFamily].family,
                },
              ]}
              placeholder={t('webToMarkdown.urlPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={convertToMarkdown}
            />
            <TouchableOpacity
              style={[
                styles.convertButton,
                {
                  backgroundColor: themeColors[accentColor],
                  opacity: url.trim() && !isLoading ? 1 : 0.5,
                },
              ]}
              onPress={convertToMarkdown}
              disabled={!url.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="arrow-forward" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {/* Preserve Code Examples Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                {
                  backgroundColor: preserveCodeExamples ? themeColors[accentColor] : theme.card,
                  borderColor: preserveCodeExamples ? themeColors[accentColor] : theme.border,
                },
              ]}
              onPress={() => setPreserveCodeExamples(!preserveCodeExamples)}
              activeOpacity={0.7}
            >
              <View style={styles.toggleContent}>
                <Ionicons
                  name={preserveCodeExamples ? 'code-working' : 'code-working-outline'}
                  size={20}
                  color={preserveCodeExamples ? 'white' : themeColors[accentColor]}
                />
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: preserveCodeExamples ? 'white' : theme.text,
                      fontSize: fontSizes[fontSize].contentSize * 0.9,
                      fontFamily: fontFamilies[fontFamily].family,
                    },
                  ]}
                >
                  {t('webToMarkdown.preserveCodeExamples')}
                </Text>
              </View>
            </TouchableOpacity>
            <Text
              style={[
                styles.toggleHint,
                {
                  color: theme.textSecondary,
                  fontSize: fontSizes[fontSize].contentSize * 0.8,
                  fontFamily: fontFamilies[fontFamily].family,
                },
              ]}
            >
              Keep educational code snippets in the converted content
            </Text>
          </View>

          {/* AI Extraction Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                {
                  backgroundColor: useAI ? themeColors[accentColor] : theme.card,
                  borderColor: useAI ? themeColors[accentColor] : theme.border,
                },
              ]}
              onPress={() => setUseAI(!useAI)}
              activeOpacity={0.7}
            >
              <View style={styles.toggleContent}>
                <Ionicons
                  name={useAI ? 'sparkles' : 'sparkles-outline'}
                  size={20}
                  color={useAI ? 'white' : themeColors[accentColor]}
                />
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: useAI ? 'white' : theme.text,
                      fontSize: fontSizes[fontSize].contentSize * 0.9,
                      fontFamily: fontFamilies[fontFamily].family,
                    },
                  ]}
                >
                  {t('webToMarkdown.useAI')}
                </Text>
              </View>
            </TouchableOpacity>
            <Text
              style={[
                styles.toggleHint,
                {
                  color: theme.textSecondary,
                  fontSize: fontSizes[fontSize].contentSize * 0.8,
                  fontFamily: fontFamilies[fontFamily].family,
                },
              ]}
            >
              Use AI to intelligently remove ads and extract clean content
            </Text>
          </View>

          {error ? <Text style={[styles.errorText, { color: 'red' }]}>{error}</Text> : null}
        </View>

        {/* Markdown Output Section */}
        {markdown ? (
          <View style={styles.outputSection}>
            <View style={styles.outputHeader}>
              <View style={styles.outputTitle}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  {t('webToMarkdown.markdownOutput')}
                </Text>
                {isStreaming && (
                  <View style={styles.streamingIndicator}>
                    <Ionicons
                      name="sparkles"
                      size={16}
                      color={themeColors[accentColor]}
                      style={styles.sparkleIcon}
                    />
                    <Text style={[styles.streamingText, { color: themeColors[accentColor] }]}>
                      AI Writing...
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.outputActions}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.card }]}
                  onPress={copyToClipboard}
                  disabled={isStreaming}
                >
                  <Ionicons
                    name="copy"
                    size={18}
                    color={isStreaming ? theme.textSecondary : themeColors[accentColor]}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.card }]}
                  onPress={shareMarkdown}
                  disabled={isStreaming}
                >
                  <Ionicons
                    name="share"
                    size={18}
                    color={isStreaming ? theme.textSecondary : themeColors[accentColor]}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={[
                styles.markdownContainer,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              nestedScrollEnabled={true}
            >
              {isStreaming ? (
                <Text
                  style={[
                    styles.markdownText,
                    {
                      color: theme.text,
                      fontSize: fontSizes[fontSize].contentSize * 0.9,
                      fontFamily: 'monospace',
                    },
                  ]}
                  selectable={true}
                >
                  {markdown}
                </Text>
              ) : (
                <TextInput
                  ref={markdownRef}
                  style={[
                    styles.markdownText,
                    {
                      color: theme.text,
                      fontSize: fontSizes[fontSize].contentSize * 0.9,
                      fontFamily: 'monospace',
                    },
                  ]}
                  value={markdown}
                  onChangeText={setMarkdown}
                  multiline
                  textAlignVertical="top"
                  placeholder={t('webToMarkdown.markdownPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                />
              )}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.placeholderSection}>
            <Ionicons name="document-text-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
              {t('webToMarkdown.emptyStateTitle')}
            </Text>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={[styles.instructionsTitle, { color: theme.text }]}>
            {t('webToMarkdown.instructionTitle')}
          </Text>
          <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
            {t('webToMarkdown.instruction1')}
          </Text>
          <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
            {t('webToMarkdown.instruction2')}
          </Text>
          <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
            {t('webToMarkdown.instruction3')}
          </Text>
          <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
            {t('webToMarkdown.instruction4')}
          </Text>

          {/* Disclaimer */}
          <View
            style={[
              styles.disclaimerContainer,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
              {t('webToMarkdown.disclaimerText')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeader: {
    alignItems: 'center',
    borderBottomColor: 'rgba(0,0,0,0.1)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerBackButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'left',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  inputSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  urlInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    minHeight: 48,
  },
  convertButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  outputSection: {
    marginBottom: 30,
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  outputActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markdownContainer: {
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 400,
  },
  markdownText: {
    padding: 16,
    minHeight: 200,
    lineHeight: 20,
  },
  placeholderSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    marginBottom: 30,
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
    maxWidth: 280,
  },
  instructionsSection: {
    marginTop: 20,
    gap: 8,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  toggleContainer: {
    marginTop: 16,
    gap: 8,
  },
  toggleButton: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  toggleHint: {
    marginLeft: 4,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  outputTitle: {
    flexDirection: 'column',
    gap: 4,
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sparkleIcon: {
    opacity: 0.8,
  },
  streamingText: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
