import { AI_CONFIG, CONTENT_EXTRACTION_PROMPT } from '../config/ai';

export interface GeminiResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export interface ContentGenerationResponse {
  success: boolean;
  title?: string;
  content?: string;
  error?: string;
}

export interface GeminiStreamCallback {
  onChunk: (chunk: string) => void;
  onComplete: (fullContent: string) => void;
  onError: (error: string) => void;
}

export class GeminiService {
  private apiKey: string;
  private endpoint: string;

  constructor() {
    this.apiKey = AI_CONFIG.gemini.apiKey;
    this.endpoint = AI_CONFIG.gemini.endpoint;
  }

  getModel(): string {
    return AI_CONFIG.gemini.model;
  }

  async analyzeContentForImage(content: string): Promise<GeminiResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Gemini API key not configured. Please add your key to app/config/ai.ts',
      };
    }

    const analysisPrompt = `Analyze this content and create a concise, descriptive image prompt for a cover image:

Content to analyze:
"${content}"

Instructions:
- Extract the main topic and theme
- Identify the mood/tone (professional, creative, technical, inspiring, etc.)
- Determine appropriate visual style
- Keep it concise but descriptive

Format your response as a single line image prompt suitable for AI image generation:
[main subject], [visual style], [mood/tone], [composition/perspective]

Examples:
- "modern workspace desk, clean minimal photography, professional productive, top-down view"
- "mountain sunrise landscape, digital art illustration, inspiring peaceful, wide panoramic"
- "abstract brain connections, futuristic neon style, innovative tech, network visualization"

Generate ONLY the image prompt, no explanations or additional text:`;

    return this.generateContent(analysisPrompt);
  }

  async analyzeImage(
    imageBase64: string,
    question: string = 'What do you see in this image?'
  ): Promise<GeminiResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Gemini API key not configured. Please add your key to app/config/ai.ts',
      };
    }

    const modelsToTry = [AI_CONFIG.gemini.model, ...(AI_CONFIG.gemini.fallbackModels || [])];

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];

      try {
        const url = `${this.endpoint}/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        const requestBody = {
          contents: [
            {
              parts: [
                {
                  text: question,
                },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
          ],
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const generatedText = data.candidates[0].content.parts[0].text;
          return {
            success: true,
            content: generatedText.trim(),
          };
        } else {
          throw new Error('No content generated');
        }
      } catch (error: any) {
        console.error(`Image analysis error with ${model}:`, error);

        if (
          (error.message?.includes('503') || error.message?.includes('overloaded')) &&
          i < modelsToTry.length - 1
        ) {
          console.log(`Model ${model} overloaded, trying next model...`);
          continue;
        }

        return {
          success: false,
          error: error.message || 'Failed to analyze image',
        };
      }
    }

    return {
      success: false,
      error: 'All models failed to analyze image',
    };
  }

  async generateContentWithTitle(prompt: string): Promise<ContentGenerationResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Gemini API key not configured. Please add your key to app/config/ai.ts',
      };
    }

    const contentPrompt = `Generate content based on this prompt with a separate title:

Prompt: "${prompt}"

Instructions:
- Create an engaging, informative title (max 60 characters)
- Generate detailed, well-structured content using markdown formatting
- Include relevant subheadings, bullet points, or numbered lists where appropriate
- Make the content comprehensive and valuable

Format your response EXACTLY as follows:
TITLE: [Your title here]

CONTENT:
[Your content here in markdown format]

Important: Use EXACTLY this format with "TITLE:" and "CONTENT:" labels.`;

    const response = await this.generateContent(contentPrompt);

    if (!response.success || !response.content) {
      return {
        success: false,
        error: response.error || 'Failed to generate content with title',
      };
    }

    // Parse the response to extract title and content
    const parsed = this.parseContentWithTitle(response.content);

    return {
      success: true,
      title: parsed.title,
      content: parsed.content,
    };
  }

  private parseContentWithTitle(response: string): { title: string; content: string } {
    const lines = response.split('\n');
    let title = '';
    let content = '';
    let inContent = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('TITLE:')) {
        title = line.replace('TITLE:', '').trim();
      } else if (line.startsWith('CONTENT:')) {
        inContent = true;
        // Skip the CONTENT: line and start collecting from next line
        continue;
      } else if (inContent) {
        content += line + '\n';
      }
    }

    // Fallback: if no proper format found, try to extract first line as title
    if (!title && response.trim()) {
      const firstLine = response.split('\n')[0].trim();
      if (firstLine.length <= 100) {
        title = firstLine.replace(/^#+\s*/, ''); // Remove markdown heading
        content = response.split('\n').slice(1).join('\n').trim();
      } else {
        // Generate a simple title from first few words
        title = firstLine.substring(0, 60).split(' ').slice(0, -1).join(' ') + '...';
        content = response.trim();
      }
    }

    return {
      title: title || 'Generated Content',
      content: content.trim() || response.trim(),
    };
  }

  async generateContent(prompt: string): Promise<GeminiResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Gemini API key not configured. Please add your key to app/config/ai.ts',
      };
    }

    const modelsToTry = [AI_CONFIG.gemini.model, ...(AI_CONFIG.gemini.fallbackModels || [])];

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];

      try {
        const url = `${this.endpoint}/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        const requestBody = {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
          ],
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const generatedText = data.candidates[0].content.parts[0].text;
          return {
            success: true,
            content: generatedText.trim(),
          };
        } else {
          throw new Error('No content generated');
        }
      } catch (error: any) {
        console.error(`Generation error with ${model}:`, error);

        if (
          (error.message?.includes('503') || error.message?.includes('overloaded')) &&
          i < modelsToTry.length - 1
        ) {
          console.log(`Model ${model} overloaded, trying next model...`);
          continue;
        }

        return {
          success: false,
          error: error.message || 'Failed to generate content',
        };
      }
    }

    return {
      success: false,
      error: 'All models failed to generate content',
    };
  }

  isConfigured(): boolean {
    return this.apiKey !== 'YOUR_GEMINI_API_KEY_HERE' && this.apiKey.length > 0;
  }

  async extractContentStream(
    html: string,
    url: string,
    callback: GeminiStreamCallback
  ): Promise<void> {
    if (!this.isConfigured()) {
      callback.onError('Gemini API key not configured. Please add your key to app/config/ai.ts');
      return;
    }

    // Try primary model first, then fallback models
    const modelsToTry = [AI_CONFIG.gemini.model, ...(AI_CONFIG.gemini.fallbackModels || [])];

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];

      try {
        await this.tryStreamWithModel(html, url, model, callback);
        return; // Success, exit
      } catch (error: any) {
        console.error(`Stream error with ${model}:`, error);

        // If this was a 503 error and we have more models to try, continue
        if (
          (error.message?.includes('503') || error.message?.includes('overloaded')) &&
          i < modelsToTry.length - 1
        ) {
          console.log(`Model ${model} overloaded, trying next model...`);
          continue;
        }

        // For other errors or last model, report error
        if (i === modelsToTry.length - 1) {
          callback.onError('All models failed or are overloaded. Please try again later.');
        }
      }
    }
  }

  async extractContent(html: string, url: string): Promise<GeminiResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Gemini API key not configured. Please add your key to app/config/ai.ts',
      };
    }

    // Try primary model first, then fallback models
    const modelsToTry = [AI_CONFIG.gemini.model, ...(AI_CONFIG.gemini.fallbackModels || [])];

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      const result = await this.tryWithModel(html, url, model, i + 1, modelsToTry.length);

      if (result.success) {
        return result;
      }

      // If this was a 503 error and we have more models to try, continue
      if (result.error?.includes('503') || result.error?.includes('overloaded')) {
        console.log(`Model ${model} overloaded, trying next model...`);
        continue;
      }

      // For other errors, try with retry logic
      if (i === 0) {
        // Only retry on primary model
        for (let retry = 1; retry <= AI_CONFIG.gemini.retryAttempts; retry++) {
          console.log(
            `Retrying with ${model} (attempt ${retry}/${AI_CONFIG.gemini.retryAttempts})...`
          );
          await this.delay(AI_CONFIG.gemini.retryDelay * retry); // Exponential backoff

          const retryResult = await this.tryWithModel(html, url, model, retry, modelsToTry.length);
          if (retryResult.success) {
            return retryResult;
          }

          if (!retryResult.error?.includes('503') && !retryResult.error?.includes('overloaded')) {
            break; // Don't retry non-503 errors
          }
        }
      }
    }

    return {
      success: false,
      error: 'All models failed or are overloaded. Please try again later.',
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private cleanMarkdownContent(content: string): string {
    let cleaned = content;

    // Remove common AI response prefixes/suffixes
    const unwantedPrefixes = [
      "Here's the extracted content:",
      'Here is the extracted content:',
      'The extracted content is:',
      'Extracted content:',
      "Here's the markdown:",
      'Here is the markdown:',
      '```markdown',
      '```',
    ];

    const unwantedSuffixes = [
      '```',
      "That's the extracted content.",
      'This is the clean markdown content.',
    ];

    // Remove prefixes
    for (const prefix of unwantedPrefixes) {
      if (cleaned.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleaned = cleaned.substring(prefix.length).trim();
      }
    }

    // Remove suffixes
    for (const suffix of unwantedSuffixes) {
      if (cleaned.toLowerCase().endsWith(suffix.toLowerCase())) {
        cleaned = cleaned.substring(0, cleaned.length - suffix.length).trim();
      }
    }

    // Ensure proper markdown formatting
    cleaned = cleaned
      // Fix multiple newlines
      .replace(/\n{4,}/g, '\n\n\n')
      // Fix spaces around headers
      .replace(/^(#{1,6})\s*(.+)$/gm, '$1 $2')
      // Fix list formatting
      .replace(/^(\s*)-\s*(.+)$/gm, '$1- $2')
      .replace(/^(\s*)\*\s*(.+)$/gm, '$1- $2')
      // Fix link formatting
      .replace(/\[([^\]]+)\]\s*\(([^)]+)\)/g, '[$1]($2)')
      // Fix bold formatting
      .replace(/\*\*([^*]+)\*\*/g, '**$1**')
      // Fix italic formatting
      .replace(/\*([^*]+)\*/g, '*$1*')
      // Clean up extra spaces
      .replace(/ {2,}/g, ' ')
      .replace(/^ +/gm, '')
      .trim();

    // If content doesn't start with # and looks like it has a title, add one
    if (!cleaned.startsWith('#') && cleaned.length > 0) {
      const lines = cleaned.split('\n');
      const firstLine = lines[0].trim();

      // If first line looks like a title (short, no markdown formatting)
      if (
        firstLine.length < 100 &&
        !firstLine.includes('**') &&
        !firstLine.includes('*') &&
        !firstLine.startsWith('-')
      ) {
        lines[0] = `# ${firstLine}`;
        cleaned = lines.join('\n');
      }
    }

    return cleaned;
  }

  private async tryStreamWithModel(
    html: string,
    url: string,
    model: string,
    callback: GeminiStreamCallback
  ): Promise<void> {
    // Limit HTML size to avoid token limits
    const truncatedHtml =
      html.length > 100000 ? html.substring(0, 100000) + '\n[Content truncated...]' : html;
    const prompt = `${CONTENT_EXTRACTION_PROMPT}\n\nWebsite URL: ${url}\n\n${truncatedHtml}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 8192,
        stopSequences: [],
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?alt=sse`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout for streaming

    const response = await fetch(`${endpoint}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(`${response.status} - ${errorData?.error?.message || response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.trim() && !line.startsWith('data: ')) {
            try {
              const jsonData = JSON.parse(line);

              if (jsonData.candidates && jsonData.candidates[0]?.content?.parts?.[0]?.text) {
                const textChunk = jsonData.candidates[0].content.parts[0].text;
                fullContent += textChunk;

                // Send raw chunk for real-time display
                callback.onChunk(textChunk);
              }
            } catch (parseError) {
              // Skip malformed JSON lines
              continue;
            }
          }
        }
      }

      // Send final cleaned content
      const finalContent = this.cleanMarkdownContent(fullContent);
      callback.onComplete(finalContent);
    } catch (streamError) {
      throw streamError;
    } finally {
      reader.releaseLock();
    }
  }

  private async tryWithModel(
    html: string,
    url: string,
    model: string,
    attempt: number,
    totalModels: number
  ): Promise<GeminiResponse> {
    try {
      // Limit HTML size to avoid token limits (roughly 100k characters = ~25k tokens)
      const truncatedHtml =
        html.length > 100000 ? html.substring(0, 100000) + '\n[Content truncated...]' : html;

      const prompt = `${CONTENT_EXTRACTION_PROMPT}\n\nWebsite URL: ${url}\n\n${truncatedHtml}`;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 8192,
          stopSequences: [],
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      };

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${endpoint}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`${response.status} - ${errorData?.error?.message || response.statusText}`);
      }

      const data = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No content generated by Gemini');
      }

      const content = data.candidates[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw new Error('Empty response from Gemini');
      }

      // Post-process the content to ensure it's proper markdown
      const cleanContent = this.cleanMarkdownContent(content.trim());

      return {
        success: true,
        content: cleanContent,
      };
    } catch (error: any) {
      console.error(`Gemini extraction error with ${model}:`, error);

      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout - please try again',
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to extract content with AI',
      };
    }
  }
}

export const geminiService = new GeminiService();
