# Contributing to Mindbook Pro

Thank you for your interest in contributing to **Mindbook Pro**! We welcome contributions from the community to improve this secure, multilingual note-taking app. Whether you're fixing bugs, adding features, or enhancing documentation, your help is invaluable.

This guide outlines how to contribute effectively and ensures a smooth collaboration process.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Coding Guidelines](#coding-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Contact](#contact)

## Code of Conduct

We aim to foster an open and inclusive community. By participating, you agree to abide by our **[Code of Conduct](CODE_OF_CONDUCT.md)** (to be added). Please treat everyone with respect and kindness.

## How Can I Contribute?

There are many ways to contribute to Mindbook Pro:

- **Bug Fixes:** Resolve issues listed in the [Issues](https://github.com/melihcanndemir/mindbook/issues) tab.
- **New Features:** Implement enhancements or propose new ideas (e.g., additional languages, UI improvements).
- **Documentation:** Improve README, add guides (e.g., AI server setup), or translate docs.
- **Testing:** Write or expand test cases to ensure stability.
- **Code Review:** Review pull requests from other contributors.

No contribution is too small—every effort helps!

## Getting Started

### Prerequisites

- **Node.js**: >= 16.0.0
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI**: `npm install -g eas-cli` (for builds)
- **Python**: >= 3.8 (optional, for AI assistant)
- **Git**: For cloning and version control

### Setup

1. **Fork the Repository:**

   - Click "Fork" on [GitHub](https://github.com/melihcanndemir/mindbook) and clone your fork:
     ```bash
     git clone https://github.com/YOUR_USERNAME/mindbook.git
     cd mindbook
     ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment:**

   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` with your credentials (e.g., Supabase URL, encryption key). See [README](README.md) for details.

4. **Run Locally:**

   ```bash
   npm start
   ```

   - Use Expo Go or a simulator to test.

5. **Optional - AI Assistant:**
   - Set up the Python environment:
     ```bash
     python -m venv venv
     source venv/bin/activate  # On Windows: venv\Scripts\activate
     pip install -r requirements.txt
     python app.py
     ```

## Development Workflow

1. **Choose an Issue:**

   - Browse [open issues](https://github.com/melihcanndemir/mindbook/issues) or create one if your idea isn’t listed.

2. **Create a Branch:**

   - Use a descriptive name:
     ```bash
     git checkout -b feature/add-spanish-support
     ```
   - Examples: `bug/fix-vault-encryption`, `docs/update-readme`.

3. **Make Changes:**

   - Work on your feature or fix. Follow the [Coding Guidelines](#coding-guidelines).

4. **Commit Changes:**

   - Write clear, concise commit messages:
     ```bash
     git commit -m "feat: add Spanish language support"
     ```
   - Use [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `docs:`).

5. **Push to Your Fork:**
   ```bash
   git push origin feature/add-spanish-support
   ```

## Submitting a Pull Request

1. **Open a Pull Request (PR):**

   - Go to your fork on GitHub and click "New Pull Request."
   - Target the `main` branch of the original repository.

2. **Describe Your Changes:**

   - Use the PR template (if available) or include:
     - What you changed and why.
     - Related issue number (e.g., "Fixes #123").
     - Screenshots or logs (if applicable).

3. **Await Review:**
   - Respond to feedback and make requested changes. PRs are merged after approval.

## Coding Guidelines

- **Language:** JavaScript (ES6+) for React Native, Python 3 for AI server.
- **Style:** Follow Airbnb’s [JavaScript Style Guide](https://github.com/airbnb/javascript). Use Prettier for formatting:
  ```bash
  npm run format
  ```
- **File Structure:**
  - Components: `src/components/`
  - Utilities: `src/utils/`
  - Redux: `src/store/`
- **Naming:** Use camelCase for variables/functions, PascalCase for components.
- **Comments:** Add JSDoc-style comments for complex functions:
  ```javascript
  /**
   * Encrypts notes using AES-256
   * @param {Array} notes - List of notes to encrypt
   * @returns {string} Encrypted string
   */
  export const encryptNotes = (notes) => { ... };
  ```

## Testing

- **Run Tests:**
  ```bash
  npm test
  ```
- **Write Tests:** Use Jest and React Native Testing Library:
  ```javascript
  describe('encryptNotes', () => {
    it('encrypts notes correctly', () => {
      const notes = [{ id: 1, text: 'test' }];
      const encrypted = encryptNotes(notes);
      expect(encrypted).toBeDefined();
    });
  });
  ```
- Submit tests with your changes to maintain stability.

## Documentation

- Update [README](README.md) or add to `docs/` if your change affects setup or usage.
- Example: Add a new language? Update the "Features" section.

## Reporting Bugs

- Open an issue with:
  - Title: e.g., "Vault encryption fails on Android 14"
  - Description: Steps to reproduce, expected vs. actual behavior, device/OS details.
  - Screenshots/logs (if possible).

## Requesting Features

- Open an issue with:
  - Title: e.g., "Add Italian language support"
  - Description: Why it’s useful, how it could work, any mockups/ideas.

## Contact

Questions? Reach out via:

- GitHub Issues: [https://github.com/melihcanndemir/mindbook/issues](https://github.com/melihcanndemir/mindbook/issues)
- Maintainer: Melih Can Demir - [@melihcanndemir](https://github.com/melihcanndemir)
