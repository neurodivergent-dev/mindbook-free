// This utils file contains the color definitions for the app.
// It includes both light and dark mode color schemes.
// The colors are defined using Material Design color guidelines.
// Each color has an id, a nameKey for localization, a background color, and a text color.
// Material Design color scheme - Light Mode
export const NOTE_COLORS = {
  default: {
    id: 'default',
    nameKey: 'common.default',
    background: 'transparent',
    text: null, // Will use theme color
  },
  red: {
    id: 'red',
    nameKey: 'colors.red',
    background: '#FFEBEE',
    text: '#C62828',
  },
  pink: {
    id: 'pink',
    nameKey: 'colors.pink',
    background: '#FCE4EC',
    text: '#AD1457',
  },
  purple: {
    id: 'purple',
    nameKey: 'colors.purple',
    background: '#F3E5F5',
    text: '#6A1B9A',
  },
  deepPurple: {
    id: 'deepPurple',
    nameKey: 'colors.deepPurple',
    background: '#EDE7F6',
    text: '#4527A0',
  },
  indigo: {
    id: 'indigo',
    nameKey: 'colors.indigo',
    background: '#E8EAF6',
    text: '#283593',
  },
  blue: {
    id: 'blue',
    nameKey: 'colors.blue',
    background: '#E3F2FD',
    text: '#1565C0',
  },
  lightBlue: {
    id: 'lightBlue',
    nameKey: 'colors.lightBlue',
    background: '#E1F5FE',
    text: '#0277BD',
  },
  cyan: {
    id: 'cyan',
    nameKey: 'colors.cyan',
    background: '#E0F7FA',
    text: '#00838F',
  },
  teal: {
    id: 'teal',
    nameKey: 'colors.teal',
    background: '#E0F2F1',
    text: '#00695C',
  },
  green: {
    id: 'green',
    nameKey: 'colors.green',
    background: '#E8F5E9',
    text: '#2E7D32',
  },
  lightGreen: {
    id: 'lightGreen',
    nameKey: 'colors.lightGreen',
    background: '#F1F8E9',
    text: '#558B2F',
  },
  lime: {
    id: 'lime',
    nameKey: 'colors.lime',
    background: '#F9FBE7',
    text: '#9E9D24',
  },
  yellow: {
    id: 'yellow',
    nameKey: 'colors.yellow',
    background: '#FFFDE7',
    text: '#F9A825',
  },
  amber: {
    id: 'amber',
    nameKey: 'colors.amber',
    background: '#FFF8E1',
    text: '#FF8F00',
  },
  orange: {
    id: 'orange',
    nameKey: 'colors.orange',
    background: '#FFF3E0',
    text: '#EF6C00',
  },
  deepOrange: {
    id: 'deepOrange',
    nameKey: 'colors.deepOrange',
    background: '#FBE9E7',
    text: '#D84315',
  },
  brown: {
    id: 'brown',
    nameKey: 'colors.brown',
    background: '#EFEBE9',
    text: '#4E342E',
  },
  grey: {
    id: 'grey',
    nameKey: 'colors.grey',
    background: '#FAFAFA',
    text: '#424242',
  },
  blueGrey: {
    id: 'blueGrey',
    nameKey: 'colors.blueGrey',
    background: '#ECEFF1',
    text: '#37474F',
  },
};

// Material Design color scheme - Dark Mode
export const DARK_NOTE_COLORS = {
  default: {
    id: 'default',
    nameKey: 'common.default',
    background: 'transparent',
    text: null, // Will use theme color
  },
  red: {
    id: 'red',
    nameKey: 'colors.red',
    background: '#3E0A0A',
    text: '#FFCDD2',
  },
  pink: {
    id: 'pink',
    nameKey: 'colors.pink',
    background: '#3E0A25',
    text: '#F8BBD0',
  },
  purple: {
    id: 'purple',
    nameKey: 'colors.purple',
    background: '#31093C',
    text: '#E1BEE7',
  },
  deepPurple: {
    id: 'deepPurple',
    nameKey: 'colors.deepPurple',
    background: '#1D0D3E',
    text: '#D1C4E9',
  },
  indigo: {
    id: 'indigo',
    nameKey: 'colors.indigo',
    background: '#0F1038',
    text: '#C5CAE9',
  },
  blue: {
    id: 'blue',
    nameKey: 'colors.blue',
    background: '#0D1D35',
    text: '#BBDEFB',
  },
  lightBlue: {
    id: 'lightBlue',
    nameKey: 'colors.lightBlue',
    background: '#051D2D',
    text: '#B3E5FC',
  },
  cyan: {
    id: 'cyan',
    nameKey: 'colors.cyan',
    background: '#05232A',
    text: '#B2EBF2',
  },
  teal: {
    id: 'teal',
    nameKey: 'colors.teal',
    background: '#052521',
    text: '#B2DFDB',
  },
  green: {
    id: 'green',
    nameKey: 'colors.green',
    background: '#0A280E',
    text: '#C8E6C9',
  },
  lightGreen: {
    id: 'lightGreen',
    nameKey: 'colors.lightGreen',
    background: '#162111',
    text: '#DCEDC8',
  },
  lime: {
    id: 'lime',
    nameKey: 'colors.lime',
    background: '#1E250A',
    text: '#F0F4C3',
  },
  yellow: {
    id: 'yellow',
    nameKey: 'colors.yellow',
    background: '#261F0D',
    text: '#FFF9C4',
  },
  amber: {
    id: 'amber',
    nameKey: 'colors.amber',
    background: '#261C08',
    text: '#FFECB3',
  },
  orange: {
    id: 'orange',
    nameKey: 'colors.orange',
    background: '#271A08',
    text: '#FFE0B2',
  },
  deepOrange: {
    id: 'deepOrange',
    nameKey: 'colors.deepOrange',
    background: '#271409',
    text: '#FFCCBC',
  },
  brown: {
    id: 'brown',
    nameKey: 'colors.brown',
    background: '#251613',
    text: '#D7CCC8',
  },
  grey: {
    id: 'grey',
    nameKey: 'colors.grey',
    background: '#222222',
    text: '#EEEEEE',
  },
  blueGrey: {
    id: 'blueGrey',
    nameKey: 'colors.blueGrey',
    background: '#18232C',
    text: '#CFD8DC',
  },
};

export default {
  NOTE_COLORS,
  DARK_NOTE_COLORS,
};
