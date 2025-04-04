// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from 'react';
import { Text } from 'react-native';

// Simple mock components for Expo vector icons
const createIconSetMock = () => {
  return {
    font: {},
    glyphMap: {},
    getRawGlyphMap: () => ({}),
  };
};

// Mock up all icon families
const mockIcon = name => props => {
  return <Text>{props.name || 'mock-icon'}</Text>;
};

// All needed icon families
module.exports = {
  createIconSet: () => mockIcon('createIconSet'),
  Ionicons: mockIcon('Ionicons'),
  MaterialIcons: mockIcon('MaterialIcons'),
  FontAwesome: mockIcon('FontAwesome'),
  MaterialCommunityIcons: mockIcon('MaterialCommunityIcons'),
  SimpleLineIcons: mockIcon('SimpleLineIcons'),
  Entypo: mockIcon('Entypo'),
  Feather: mockIcon('Feather'),
  AntDesign: mockIcon('AntDesign'),
};
