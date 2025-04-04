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
  caveatBrush: {
    id: 'caveatBrush',
    name: () => i18next.t('fonts.families.caveatBrush'),
    family: 'CaveatBrush-Regular',
  },
  montserrat: {
    id: 'montserrat',
    name: () => i18next.t('fonts.families.montserrat'),
    family: 'Montserrat-Regular',
  },
  openSans: {
    id: 'openSans',
    name: () => i18next.t('fonts.families.openSans'),
    family: 'OpenSans-Regular',
  },
  roboto: {
    id: 'roboto',
    name: () => i18next.t('fonts.families.roboto'),
    family: 'Roboto-Regular',
  },
  poppins: {
    id: 'poppins',
    name: () => 'Poppins',
    family: 'Poppins-Regular',
  },
  poppinsBold: {
    id: 'poppinsBold',
    name: () => 'Poppins Bold',
    family: 'Poppins-Bold',
  },
  raleway: {
    id: 'raleway',
    name: () => 'Raleway',
    family: 'Raleway-Regular',
  },
  ralewayBold: {
    id: 'ralewayBold',
    name: () => 'Raleway Bold',
    family: 'Raleway-Bold',
  },
  lato: {
    id: 'lato',
    name: () => 'Lato',
    family: 'Lato-Regular',
  },
  latoBold: {
    id: 'latoBold',
    name: () => 'Lato Bold',
    family: 'Lato-Bold',
  },
  inter: {
    id: 'inter',
    name: () => 'Inter',
    family: 'Inter-Regular',
  },
  interBold: {
    id: 'interBold',
    name: () => 'Inter Bold',
    family: 'Inter-Bold',
  },
};

export default {
  FONT_SIZES,
  FONT_FAMILIES,
};
