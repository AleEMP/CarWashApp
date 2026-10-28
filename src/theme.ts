export const colors = {
  background: '#F5F2EC',
  surface: '#FFFFFF',
  surfaceMuted: '#EEE9E1',
  border: '#E6E0D6',
  borderStrong: '#D5CDBF',

  text: '#13202E',
  textSecondary: '#3B4654',
  textMuted: '#5B6572',

  primary: '#0B5FA5',
  primaryPressed: '#084A82',
  primarySoft: '#E4EEF8',
  onPrimary: '#FFFFFF',

  success: '#1B7A4B',
  successSoft: '#E3F2E9',
  warning: '#7A4300',
  warningSoft: '#FCF0DC',
  danger: '#B3261E',
  dangerSoft: '#FBE8E6',
  star: '#E8A21A',
} as const;

// Cada peso es una familia distinta: en React Native fontWeight no elige pesos de fuentes personalizadas.
export const fonts = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  extrabold: 'Figtree_800ExtraBold',
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const fontSize = {
  caption: 12,
  small: 13,
  body: 15,
  lead: 17,
  title: 20,
  display: 38,
} as const;
