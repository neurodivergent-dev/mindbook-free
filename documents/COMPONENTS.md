# MindBook Pro - Component Documentation

This document provides detailed documentation for all reusable components in the MindBook Pro application.

## Table of Contents

1. [AIAssistant](#aiassistant)
2. [CategoryInputModal](#categoryinputmodal)
3. [CustomDrawer](#customdrawer)
4. [DrawerContent](#drawercontent)
5. [EmptyState](#emptystate)
6. [EnvDebugger](#envdebugger)
7. [NoteCard](#notecard)
8. [OnboardingSlides](#onboardingslides)

## Component Details

### AIAssistant

**Purpose**: Provides an AI-powered assistant interface for user interactions.

**Props**:

```typescript
{
  isVisible: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
  messages: Array<{
    content: string;
    role: 'user' | 'assistant';
  }>;
}
```

**Usage Example**:

```tsx
<AIAssistant
  isVisible={showAI}
  onClose={() => setShowAI(false)}
  onSend={handleSendMessage}
  messages={conversationHistory}
/>
```

### CategoryInputModal

**Purpose**: Modal component for creating or editing note categories.

**Props**:

```typescript
{
  visible: boolean;
  onClose: () => void;
  onSave: (category: CategoryType) => void;
  initialValue?: CategoryType;
}
```

**Usage Example**:

```tsx
<CategoryInputModal
  visible={showModal}
  onClose={() => setShowModal(false)}
  onSave={handleSaveCategory}
  initialValue={existingCategory}
/>
```

### CustomDrawer

**Purpose**: Custom navigation drawer with advanced styling and animations.

**Props**:

```typescript
{
  state: DrawerNavigationState;
  navigation: DrawerNavigationProp;
  descriptors: DrawerDescriptorMap;
}
```

**Features**:

- Animated transitions
- Custom theme support
- User profile section
- Navigation items with icons

### DrawerContent

**Purpose**: Content component for the CustomDrawer with navigation items.

**Props**:

```typescript
{
  navigation: DrawerNavigationProp;
  theme: ThemeType;
}
```

**Features**:

- Navigation item list
- Active route highlighting
- Theme-aware styling

### EmptyState

**Purpose**: Displays a placeholder when no content is available.

**Props**:

```typescript
{
  type: 'notes' | 'search' | 'favorites';
  message?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}
```

**Usage Example**:

```tsx
<EmptyState
  type="notes"
  message="No notes found"
  action={{
    label: 'Create Note',
    onPress: handleCreateNote,
  }}
/>
```

### EnvDebugger

**Purpose**: Development tool for debugging environment variables.

**Props**:

```typescript
{
  visible: boolean;
  onClose: () => void;
}
```

**Note**: Only available in development mode.

### NoteCard

**Purpose**: Displays individual note items with rich formatting.

**Props**:

```typescript
{
  note: NoteType;
  onPress: (note: NoteType) => void;
  onLongPress?: (note: NoteType) => void;
  style?: ViewStyle;
  showActions?: boolean;
}
```

**Features**:

- Markdown rendering
- Image preview
- Action buttons
- Swipe actions
- Share functionality

**Usage Example**:

```tsx
<NoteCard
  note={noteData}
  onPress={handleNotePress}
  onLongPress={handleNoteLongPress}
  showActions={true}
/>
```

### OnboardingSlides

**Purpose**: Onboarding experience for new users.

**Props**:

```typescript
{
  onComplete: () => void;
  theme: ThemeType;
}
```

**Features**:

- Animated transitions
- Progress indicators
- Skip functionality
- Responsive design

## Best Practices

1. **Performance**

   - Use `React.memo()` for components that receive primitive props
   - Implement `useCallback` for event handlers
   - Lazy load components when possible

2. **Accessibility**

   - All components support screen readers
   - Proper ARIA labels
   - Keyboard navigation support

3. **Styling**

   - Theme-aware components
   - Responsive design
   - Dark mode support

4. **State Management**
   - Props for component-specific state
   - Redux for global state
   - Context for theme and auth

## Testing

Each component has corresponding test files with:

- Unit tests
- Integration tests
- Snapshot tests
- Accessibility tests

Example test structure:

```typescript
describe('ComponentName', () => {
  it('renders correctly', () => {
    // Test implementation
  });

  it('handles user interactions', () => {
    // Test implementation
  });

  it('matches snapshot', () => {
    // Test implementation
  });
});
```

## Error Boundaries

Components are wrapped with error boundaries to gracefully handle failures:

```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <Component {...props} />
</ErrorBoundary>
```

## Performance Monitoring

Components are monitored for:

- Render times
- Memory usage
- Re-render frequency
- Bundle size impact

## Contribution Guidelines

1. Follow the component structure template
2. Include proper TypeScript types
3. Add comprehensive tests
4. Document all props and methods
5. Include usage examples
6. Update this documentation

## Version History

Keep track of major component changes:

```markdown
### v4.0.1

- Added AIAssistant component
- Enhanced NoteCard with sharing features
- Improved accessibility in all components
```
