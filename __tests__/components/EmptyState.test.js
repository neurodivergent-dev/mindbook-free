// This file is for testing the EmptyState component
import React from 'react';
import { render } from '@testing-library/react-native';
import EmptyState from '../../app/components/EmptyState';

// Mocks
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('../../app/context/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      text: '#000000',
      textSecondary: '#666666',
    },
    themeColors: {
      blue: '#0077FF',
    },
    accentColor: 'blue',
  }),
}));

// Mock ExpoVectorIcons mock
jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@expo/vector-icons/MaterialIcons', () => 'MaterialIcons');

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: props => React.createElement(Text, props, props.name || 'mock-icon'),
    MaterialIcons: props => React.createElement(Text, props, props.name || 'mock-icon'),
  };
});

describe('EmptyState', () => {
  test('renders with basic props', () => {
    const { getByText } = render(<EmptyState title="Test Title" message="Test Message" />);

    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Message')).toBeTruthy();
  });

  test('renders with custom icon', () => {
    const { getByText } = render(
      <EmptyState icon="star" title="Test with Star" message="Custom Icon Test" />
    );

    expect(getByText('Test with Star')).toBeTruthy();
    expect(getByText('Custom Icon Test')).toBeTruthy();
  });

  test('renders for empty favorites', () => {
    const { getByText } = render(
      <EmptyState
        title="Favorite"
        message="Custom message" // This should be overridden
      />
    );

    // The translation key must be used because the component title contains "Favorite"
    expect(getByText('notes.emptyFavorites')).toBeTruthy();
    expect(getByText('notes.emptyFavoritesMessage')).toBeTruthy();
  });

  test('renders with action button', () => {
    const mockAction = jest.fn();
    const { getByText } = render(
      <EmptyState
        title="Test with Action"
        message="Action Test"
        action={{
          label: 'Click Me',
          onPress: mockAction,
        }}
      />
    );

    expect(getByText('Click Me')).toBeTruthy();
  });

  test('renders empty notes state', () => {
    const { getByText } = render(
      <EmptyState title="No notes found" message="Create your first note" />
    );

    expect(getByText('notes.emptyNotes')).toBeTruthy();
  });
});
