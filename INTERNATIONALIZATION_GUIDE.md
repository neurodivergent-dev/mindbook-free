# MindBook Pro Internationalization Guide

This guide outlines the process for adding new language translations to MindBook Pro. The application currently supports 12 languages, and you can contribute by adding additional languages following this guide.

## Translation System Overview

MindBook Pro uses the `i18next` and `react-i18next` libraries for internationalization. All translation files are located in the `app/translations` directory, with each language having its own file (e.g., `en.tsx` for English, `fr.tsx` for French).

## File Structure

The translation files are organized in a hierarchical structure with nested objects:

```
app/translations/
├── index.tsx    # Main configuration file
├── en.tsx       # English translations
├── fr.tsx       # French translations
├── es.tsx       # Spanish translations
└── ...          # Other language files
```

Each translation file exports a default object with nested keys organized by feature or screen.

## Adding a New Language Translation

Follow these steps to add a new language to MindBook Pro:

### Step 1: Create a New Translation File

1. Identify the language code for your new language according to ISO 639-1 standards (e.g., 'it' for Italian, 'pl' for Polish).

2. Create a new file in the `app/translations` directory named `[language-code].tsx` (e.g., `it.tsx` for Italian).

3. Start by copying the structure from the English translation file:

```tsx
export default {
  common: {
    appName: 'Mindbook Pro',
    // Translate the rest of the values while keeping the keys the same
  },
  auth: {
    login: 'Login', // Replace with translation
    // ...
  },
  // ... other sections
};
```

### Step 2: Update the Translation Index

After creating your translation file, you need to register it in the main translation configuration:

1. Open `app/translations/index.tsx`

2. Import your new translation file:

```tsx
import it from './it'; // Import the new language file
```

3. Add the language to the resources object:

```tsx
const resources = {
  tr: { translation: tr },
  en: { translation: en },
  // ... existing languages
  it: { translation: it }, // Add the new language
};
```

### Step 3: Add Language to the Language Selection Menu

To make your new language available in the language selection menu:

1. Open the language selection component (usually found in the settings screen).

2. Add your language to the list of available languages:

```tsx
const languages = [
  { code: 'en', name: 'English' },
  { code: 'tr', name: 'Türkçe' },
  // ... existing languages
  { code: 'it', name: 'Italiano' }, // Add your language
];
```

## Translation Guidelines

To ensure consistent and high-quality translations:

1. **Maintain All Keys**: Do not remove any keys from the original English file.

2. **Preserve Placeholders**: Keep all placeholders (e.g., `{{count}}`, `{{value}}`) as they are used for dynamic content.

3. **Keep HTML Tags**: If translations contain HTML tags or special formatting, preserve them in your translation.

4. **Context Matters**: Consider the context where the string is used. Some words might need different translations based on context.

5. **Keep Similar Length**: Try to keep translations around the same length as the original to avoid UI layout issues.

6. **Test Your Translations**: After adding a new language, test the application thoroughly with that language selected.

## Translation Best Practices

### Special Characters

For languages with special characters, ensure your file is saved with UTF-8 encoding to preserve all characters.

### Right-to-Left (RTL) Languages

When adding RTL languages like Arabic or Hebrew:

1. Make sure the app correctly handles RTL text direction.
2. Test the UI thoroughly as layout may need adjustments.

### Gender and Pluralization

Use i18next's pluralization features for handling plural forms:

```tsx
count_one: "{{count}} item",
count_other: "{{count}} items",
```

Different languages have different pluralization rules, so adapt accordingly.

## Testing Translations

After adding a new language:

1. Build and run the app
2. Switch to your new language in the settings
3. Navigate through all screens and features
4. Verify that all text is properly translated
5. Check for text overflow or layout issues
6. Test any language-specific features (RTL support, special characters)

## Common Issues and Solutions

### Missing Translations

If you see untranslated text, check if:

- The key exists in your translation file
- The nesting structure matches the English file
- The import and registration in `index.tsx` are correct

### Text Overflow

If translated text is too long for UI elements:

- Try to shorten the translation while preserving meaning
- If not possible, report the issue so the UI can be adjusted

### Character Encoding Issues

If special characters appear incorrectly:

- Ensure your file is saved with UTF-8 encoding
- Check that no invisible character encoding issues exist

## Contribution Process

To contribute a new language translation:

1. Fork the repository
2. Add your translation following this guide
3. Submit a pull request with your changes
4. Include a brief description of your translation and any notes about language-specific considerations

## Language Testing Checklist

Before submitting your translation, verify these aspects:

- [ ] All strings are translated (no missing keys)
- [ ] Placeholders and formatting are preserved
- [ ] UI displays correctly with the new language
- [ ] Special characters render properly
- [ ] Layout works well (no text overflow or truncation)
- [ ] RTL support if applicable

By following this guide, you'll help make MindBook Pro accessible to users around the world in their native languages.
