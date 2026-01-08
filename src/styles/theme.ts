export const theme = {
  colors: {
    background: '#0A0A0A',
    surface: '#1A1A1A',
    surfaceHover: '#2A2A2A',

    text: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textDisabled: '#666666',

    primary: '#4A90E2',
    primaryDark: '#357ABD',

    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',

    divider: '#333333',
    border: '#2A2A2A',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },

  typography: {
    h1: { fontSize: 32, fontWeight: '700' as const },
    h2: { fontSize: 24, fontWeight: '600' as const },
    h3: { fontSize: 20, fontWeight: '600' as const },
    body: { fontSize: 16, fontWeight: '400' as const },
    caption: { fontSize: 14, fontWeight: '400' as const },
    small: { fontSize: 12, fontWeight: '400' as const },
  },
};
