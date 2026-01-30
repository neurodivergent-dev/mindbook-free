// This utility file defines font sizes and families for the application.
// It exports constants for font sizes and families, including their IDs, names, and styles.
// The font sizes and families are used throughout the application to maintain consistency in typography.
import i18next from 'i18next';

// Font sizes
export const FONT_SIZES = {
  small: {
    id: 'small',
    name: () => i18next.t('fonts.sizes.small'),
    titleSize: 18,
    contentSize: 14,
  },
  medium: {
    id: 'medium',
    name: () => i18next.t('fonts.sizes.medium'),
    titleSize: 20,
    contentSize: 16,
  },
  large: {
    id: 'large',
    name: () => i18next.t('fonts.sizes.large'),
    titleSize: 22,
    contentSize: 18,
  },
  xlarge: {
    id: 'xlarge',
    name: () => i18next.t('fonts.sizes.xlarge'),
    titleSize: 24,
    contentSize: 20,
  },
};

// Font families
export const FONT_FAMILIES = {
  system: {
    id: 'system',
    name: () => i18next.t('fonts.families.system'),
    family: undefined,
  },
  poppins: {
    id: 'poppins',
    name: () => 'Poppins',
    family: 'Poppins-Regular',
  },
  montserrat: {
    id: 'montserrat',
    name: () => i18next.t('fonts.families.montserrat'),
    family: 'Montserrat-Regular',
  },
  roboto: {
    id: 'roboto',
    name: () => i18next.t('fonts.families.roboto'),
    family: 'Roboto-Regular',
  },
  inter: {
    id: 'inter',
    name: () => 'Inter',
    family: 'Inter-Regular',
  },
  caveatBrush: {
    id: 'caveatBrush',
    name: () => i18next.t('fonts.families.caveatBrush'),
    family: 'CaveatBrush-Regular',
  },
};

export default {
  FONT_SIZES,
  FONT_FAMILIES,
};
