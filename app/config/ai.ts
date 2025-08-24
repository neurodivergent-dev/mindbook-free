// AI Services Configuration
// Add your API keys here or use environment variables
import Constants from 'expo-constants';

export const AI_CONFIG = {
  gemini: {
    apiKey:
      Constants.expoConfig?.extra?._gm || process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE',
    model: 'gemini-2.0-flash-exp',
    endpoint: 'https://generativelanguage.googleapis.com',
    // Fallback models when primary is overloaded (503 error)
    fallbackModels: ['gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-pro'],
    retryAttempts: 2,
    retryDelay: 1000, // 1 second - faster retry
  },
};

export const CONTENT_EXTRACTION_PROMPT = `You are an expert content extractor and markdown converter. Your task is to analyze the provided HTML and extract ONLY the main article/blog post content, then convert it to clean, well-formatted Markdown.

**CRITICAL CONTEXT & INSTRUCTIONS:**

1.  **Source Type:** The HTML is from a website URL. This URL often points to a blog post, news article, or similar content.
2.  **Content Focus:** Extract the PRIMARY ARTICLE CONTENT ONLY. This includes the main title and the body paragraphs.
3.  **Ignore Everything Else:** DO NOT include any of the following:
    - Website navigation menus, headers, footers, sidebars.
    - Advertisements, banners, or promotional content.
    - Social media widgets, share buttons, like buttons.
    - Related articles, "You might also like", "More from...", recommendation sections.
    - Comment sections, user reviews, or discussion forums.
    - Newsletter signup forms or popups.
    - Cookie notices, privacy policy links, terms of service links.
    - Author bios, bylines, publication info (unless part of the main article flow).
    - Table of contents (unless it's part of the article's narrative).
4.  **Dynamic Content:** Be aware that the main content might be loaded dynamically via JavaScript. The provided HTML is the initial server-rendered version. Your goal is to identify the structure that would contain the main content after full page load.
5.  **HTML Parsing Strategy:**
    - Look for semantic HTML5 tags like \`<article>\`, \`<main>\`.
    - Look for elements with common class names or IDs associated with content (e.g., \`.post-content\`, \`#article-body\`, \`.entry-content\`, \`.content\`, \`#main-content\`).
    - If a single clear container isn't found, use heuristics to identify the largest block of text that fits an article structure.
6.  **Markdown Conversion Rules:**
    - Start the output directly with \`# Main Article Title\`.
    - Convert headings: \`<h1>\` -> \`#\`, \`<h2>\` -> \`##\`, \`<h3>\` -> \`###\`, etc.
    - Convert paragraphs: \`<p>\` -> Paragraph with a double newline after.
    - Convert bold: \`<strong>\`, \`<b>\` -> \`**text**\`.
    - Convert italic: \`<em>\`, \`<i>\` -> \`*text*\`.
    - Convert links: \`<a href="url">text</a>\` -> \`[text](url)\`.
    - Convert lists: \`<ul><li>item</li></ul>\` -> \`- item\` (for ordered lists \`<ol>\`, use \`1. item\`).
    - Convert blockquotes: \`<blockquote>\` -> \`> quote\`.
    - Convert code: \`<code>\` -> \`code\`, \`<pre><code>\` -> \`\`\`
...
\`\`\`.
    - Remove ALL HTML tags from the final output.
    - Ensure proper spacing and formatting (double newlines between sections, single newline between list items).
7.  **Output Format:**
    - The output MUST be in clean Markdown format.
    - DO NOT include any explanatory text, prefixes like "Here is the content:", or markdown code block delimiters (e.g., \`\`\`markdown).
    - Example of expected output:
    
# The Future of Web Development

Web development is constantly evolving...

This is a paragraph in the article.

## New Trends

- Trend one
- Trend two

> A quote from the article.

**Bold statement** and *emphasized point*.

HTML Content:`;
