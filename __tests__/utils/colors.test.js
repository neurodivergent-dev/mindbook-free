// This file is for testing the colors utility
import { NOTE_COLORS, DARK_NOTE_COLORS } from '../../app/utils/colors';

describe('Color Utilities', () => {
  // NOTE_COLORS tests
  describe('NOTE_COLORS', () => {
    test('should have a default color', () => {
      expect(NOTE_COLORS.default).toBeDefined();
      expect(NOTE_COLORS.default.id).toBe('default');
      expect(NOTE_COLORS.default.background).toBe('transparent');
    });

    test('should have red color with correct values', () => {
      expect(NOTE_COLORS.red).toBeDefined();
      expect(NOTE_COLORS.red.id).toBe('red');
      expect(NOTE_COLORS.red.background).toBe('#FFEBEE');
      expect(NOTE_COLORS.red.text).toBe('#C62828');
    });

    test('should have all colors with required properties', () => {
      const requiredProps = ['id', 'nameKey', 'background', 'text'];

      Object.values(NOTE_COLORS).forEach(color => {
        requiredProps.forEach(prop => {
          expect(color).toHaveProperty(prop);
        });
      });
    });
  });

  // DARK_NOTE_COLORS tests
  describe('DARK_NOTE_COLORS', () => {
    test('should have a default color', () => {
      expect(DARK_NOTE_COLORS.default).toBeDefined();
      expect(DARK_NOTE_COLORS.default.id).toBe('default');
      expect(DARK_NOTE_COLORS.default.background).toBe('transparent');
    });

    test('should have red color with correct values', () => {
      expect(DARK_NOTE_COLORS.red).toBeDefined();
      expect(DARK_NOTE_COLORS.red.id).toBe('red');
      expect(DARK_NOTE_COLORS.red.background).toBe('#3E0A0A');
      expect(DARK_NOTE_COLORS.red.text).toBe('#FFCDD2');
    });

    test('should have all colors with required properties', () => {
      const requiredProps = ['id', 'nameKey', 'background', 'text'];

      Object.values(DARK_NOTE_COLORS).forEach(color => {
        requiredProps.forEach(prop => {
          expect(color).toHaveProperty(prop);
        });
      });
    });
  });

  // Comparison tests
  describe('Light and Dark Mode Colors Comparison', () => {
    test('should have the same color keys in both light and dark modes', () => {
      const lightKeys = Object.keys(NOTE_COLORS);
      const darkKeys = Object.keys(DARK_NOTE_COLORS);

      expect(lightKeys.sort()).toEqual(darkKeys.sort());
    });

    test('should have matching color IDs between light and dark modes', () => {
      Object.keys(NOTE_COLORS).forEach(key => {
        expect(NOTE_COLORS[key].id).toBe(DARK_NOTE_COLORS[key].id);
        expect(NOTE_COLORS[key].nameKey).toBe(DARK_NOTE_COLORS[key].nameKey);
      });
    });
  });
});
