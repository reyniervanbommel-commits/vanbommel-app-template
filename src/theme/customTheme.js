import {
  createLightTheme,
  createDarkTheme,
} from '@fluentui/react-components';

// Floris van Bommel brand ramp - navy/blauw schaal
const customBrandRamp = {
  10: '#020305',
  20: '#111723',
  30: '#16263D',
  40: '#193253',
  50: '#1B3F6A',
  60: '#1C4C82',
  70: '#1D599B',
  80: '#1E67B4',
  90: '#2775CE',
  100: '#3984D7',
  110: '#5094DC',
  120: '#66A3E1',
  130: '#7DB3E6',
  140: '#93C2EB',
  150: '#A9D1F0',
  160: '#BFE0F5',
};

export const brandAccentGold = '#B8902A';
export const brandNeutralWarm = '#F5F3F0';
export const brandNavyDeep = '#16263D';

const baseLight = createLightTheme(customBrandRamp);
const baseDark = createDarkTheme(customBrandRamp);

export const customLightTheme = {
  ...baseLight,
  borderRadiusMedium: '6px',
  borderRadiusLarge: '10px',
  borderRadiusXLarge: '14px',
  shadow4: '0 2px 8px rgba(22, 38, 61, 0.08)',
  shadow8: '0 4px 16px rgba(22, 38, 61, 0.10)',
  shadow16: '0 8px 32px rgba(22, 38, 61, 0.12)',
};

export const customDarkTheme = {
  ...baseDark,
  borderRadiusMedium: '6px',
  borderRadiusLarge: '10px',
  borderRadiusXLarge: '14px',
};

export const createCustomTheme = (isDark) => (isDark ? customDarkTheme : customLightTheme);
