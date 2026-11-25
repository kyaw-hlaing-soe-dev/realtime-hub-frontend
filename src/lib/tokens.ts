export const DESIGN_TOKENS = {
  color: {
    canvas: '#0B100E',
    surface: '#121A16',
    surfaceRaised: '#19231E',
    border: '#2A3730',
    text: '#F2F6F3',
    textMuted: '#A0ADA5',
    accent: '#B9F36A',
    scheduled: '#9DB8FF',
    finished: '#A0ADA5',
    error: '#FF8178',
    success: '#72D6A0',
  },
  typography: {
    fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    pageTitle: { size: '28px', lineHeight: '34px', weight: 600 },
    sectionTitle: { size: '16px', lineHeight: '22px', weight: 600 },
    teamName: { size: '14px', lineHeight: '20px', weight: 500 },
    metadata: { size: '12px', lineHeight: '16px', weight: 400 },
  },
  spacingScalePx: [4, 8, 12, 16, 24, 32, 48] as const,
  layout: {
    maxWidthPx: 1200,
    desktopPaddingPx: 32,
    mobilePaddingPx: 16,
  },
  radius: {
    cardPx: 10,
    controlPx: 10,
    pill: '9999px',
  },
  motionMs: {
    hoverAndSelection: 150,
    disclosure: 200,
  },
} as const;
