export const colors = {
  primary: '#C1121F',
  primaryDark: '#780000',
  primaryLight: '#FDEAEA',
  white: '#FFFFFF',
  offWhite: '#FAFAFA',
  lightGray: '#E5E5E5',
  midGray: '#7A7A7A',
  darkGray: '#1C1C1C',
  success: '#2E7D32',
  warning: '#F59E0B',
  error: '#B00020',
  primaryDisabled: '#F3B5B9',
  transparent: 'transparent',
};

export const typography = {
  screenTitle: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: colors.darkGray,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '500' as const,
    color: colors.darkGray,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: colors.darkGray,
  },
  secondary: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: colors.midGray,
  },
  button: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
};

const theme = { colors, typography, spacing, borderRadius, shadows };
export default theme;
