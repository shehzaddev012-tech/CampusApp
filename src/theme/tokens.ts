import { Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * CampusHub design tokens: "The Campus, Reimagined".
 *
 * Identity: Deep Ink + Campus Green on Warm Paper, set in Plus Jakarta Sans.
 * Everything visual (colours, spacing, radius, type, elevation) lives here so the whole
 * app can be re-skinned from one place. Screens must never hard-code colours.
 */

/** Raw brand palette. Use the semantic `Colors` below inside components. */
export const PALETTE = {
  ink: '#14231D',
  green: '#C7F36B',
  paper: '#F7F6F0',
  white: '#FFFFFF',
  sage: '#E8EDE5',
  slate: '#69736D',
  line: '#E5E8E1',
  coral: '#FF755E',
  sky: '#87C8F8',
  lavender: '#B8A5F5',
  yellow: '#F3C969',
} as const;

export const BRAND = {
  primary: PALETTE.green,
  ink: PALETTE.ink,
};

export interface Colors {
  background: string;
  surface: string;
  /** Muted sage fill: inputs, chips, quiet buttons. */
  surfaceAlt: string;
  /** Premium dark surface (feature cards). */
  inverse: string;
  onInverse: string;
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  /** Campus Green: signature colour for primary actions and highlights. */
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  /** Text/icons placed on `primary`. */
  onPrimary: string;
  /** The signed-in student's university colour (logo tile, small identity accents only). */
  university: string;
  onUniversity: string;
  /** Category colours. */
  coral: string;
  sky: string;
  lavender: string;
  yellow: string;
  /** Text on category colours (always dark ink for contrast). */
  onCategory: string;
  /** Darker variants of lavender / coral that stay readable as small text on paper or white. */
  lavenderText: string;
  coralText: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  overlay: string;
  shadow: string;
}

export const lightColors: Colors = {
  background: PALETTE.paper,
  surface: PALETTE.white,
  surfaceAlt: PALETTE.sage,
  inverse: PALETTE.ink,
  onInverse: PALETTE.paper,
  border: PALETTE.line,
  text: PALETTE.ink,
  textSecondary: PALETTE.slate,
  textTertiary: '#9AA39C',
  primary: PALETTE.green,
  primaryPressed: '#B6E453',
  primarySoft: '#EDF8D2',
  onPrimary: PALETTE.ink,
  university: PALETTE.green,
  onUniversity: PALETTE.ink,
  coral: PALETTE.coral,
  sky: PALETTE.sky,
  lavender: PALETTE.lavender,
  yellow: PALETTE.yellow,
  onCategory: PALETTE.ink,
  lavenderText: '#6A55C4',
  coralText: '#C4432E',
  accent: PALETTE.coral,
  accentSoft: '#FFE8E3',
  success: '#2B9A55',
  successSoft: '#E0F2E6',
  warning: '#B77A0B',
  warningSoft: '#FBF0D3',
  danger: '#D6443A',
  dangerSoft: '#FCE5E2',
  info: '#2F86C9',
  infoSoft: '#DFEFFB',
  overlay: 'rgba(20,35,29,0.55)',
  shadow: '#14231D',
};

export const darkColors: Colors = {
  background: '#101713',
  surface: '#19221C',
  surfaceAlt: '#222D25',
  inverse: '#0A0F0C',
  onInverse: '#F2F5EF',
  border: '#2C3930',
  text: '#F2F5EF',
  textSecondary: '#A5B1A6',
  textTertiary: '#6E7B70',
  primary: PALETTE.green,
  primaryPressed: '#B6E453',
  primarySoft: '#27361C',
  onPrimary: PALETTE.ink,
  university: PALETTE.green,
  onUniversity: PALETTE.ink,
  coral: PALETTE.coral,
  sky: PALETTE.sky,
  lavender: PALETTE.lavender,
  yellow: PALETTE.yellow,
  onCategory: PALETTE.ink,
  lavenderText: PALETTE.lavender,
  coralText: PALETTE.coral,
  accent: PALETTE.coral,
  accentSoft: '#3A2520',
  success: '#5BD08A',
  successSoft: '#16301F',
  warning: '#F3C969',
  warningSoft: '#33290F',
  danger: '#FF8579',
  dangerSoft: '#3A1D1A',
  info: '#87C8F8',
  infoSoft: '#16283A',
  overlay: 'rgba(0,0,0,0.65)',
  shadow: '#000000',
};

/** 4-point scale. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

/** Horizontal page padding. */
export const GUTTER = 20;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/** Plus Jakarta Sans, one file per weight (Android picks the file by family name). */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

type TypeStyle = Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontFamily' | 'letterSpacing'>;

/**
 * Type scale. Never combine `fontWeight` with these: the weight is baked into the
 * font family, so adding `fontWeight` would trigger fake bolding on Android.
 */
export const typography = {
  /** Oversized editorial numerals (event dates). */
  numeral: { fontFamily: fonts.extrabold, fontSize: 44, lineHeight: 46, letterSpacing: -1.5 },
  /** Hero headlines, 34-42. */
  display: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 44, letterSpacing: -1.4 },
  hero: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 38, letterSpacing: -1.0 },
  /** Screen titles, 26-32. */
  title1: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  /** Section titles, 20-24. */
  title2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.5 },
  /** Card headings, 16-19. */
  title3: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.3 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.2 },
  /** Body, 14-16. */
  bodyLg: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  /** Secondary text, 12-14. */
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  smallStrong: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  /** Labels, 10-12. */
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.1 },
  button: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
} satisfies Record<string, TypeStyle>;

export type TypographyVariant = keyof typeof typography;

export type ElevationLevel = 0 | 1 | 2 | 3;

/** Cross-platform soft shadow. Used sparingly: surfaces are separated by borders instead. */
export function elevation(level: ElevationLevel, color: string, isDark: boolean): ViewStyle {
  if (level === 0 || isDark) {
    return {};
  }
  const presets = {
    1: { o: 0.05, r: 6, h: 2, e: 1 },
    2: { o: 0.08, r: 12, h: 5, e: 3 },
    3: { o: 0.12, r: 20, h: 10, e: 6 },
  } as const;
  const p = presets[level];
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: color,
      shadowOpacity: p.o,
      shadowRadius: p.r,
      shadowOffset: { width: 0, height: p.h },
    },
    default: { shadowColor: color, elevation: p.e },
  }) as ViewStyle;
}

/** Height of the bottom tab bar (excluding the safe-area inset). */
export const TAB_BAR_HEIGHT = 64;
/** Space tab screens reserve at the bottom for the tab bar. */
export const TAB_BAR_SPACE = TAB_BAR_HEIGHT + 24;

/** Event / society categories, each with its own colour. */
export type Category = 'Tech' | 'Sports' | 'Cultural' | 'Career' | 'Social';

export function categoryColor(colors: Colors, category: Category): string {
  switch (category) {
    case 'Tech':
      return colors.sky;
    case 'Sports':
      return colors.coral;
    case 'Cultural':
      return colors.lavender;
    case 'Career':
      return colors.yellow;
    case 'Social':
      return PALETTE.green;
  }
}
