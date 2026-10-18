export const palette = {
  // Brand Hex: #67242B (Burgundy ink)
  burgundy: '#67242B',
  burgundyLight: '#8C323B',
  burgundyBright: '#A23B46',
  burgundyMuted: '#AC6D75',
  burgundyDark: '#351116',
  burgundyGlow: 'rgba(103, 36, 43, 0.16)',

  // Half-white palette (#F2F2F2)
  halfWhite: '#F2F2F2',
  halfWhiteCard: '#FFFFFF',
  halfWhiteRaised: '#EAEAEA',
  porcelain: '#F2F2F2',
  white: '#FFFFFF',

  // Light architectural surfaces (half-white)
  bgBase: '#F2F2F2',
  bgSurface: '#FAFAFA',
  bgCard: '#FFFFFF',
  bgRaised: '#EAEAEA',

  border: 'rgba(103, 36, 43, 0.12)',
  borderMid: 'rgba(103, 36, 43, 0.22)',
  borderBurgundy: '#67242B',

  // Ink Typography
  textPrimary: '#1C0A0D',
  textSecondary: '#67242B',
  textMuted: '#7E464E',

  // Neutral supporting accents
  silver: '#7E464E',
  silverSoft: '#AC6D75',
  muted: '#7E464E',

  // Buttons with reduced brightness (deep rich cordovan / wine, zero glare)
  btnPrimary: '#42161B',
  btnPrimaryHover: '#541C22',
  btnPrimaryActive: '#320F13',
  btnSecondary: '#42161B',
  btnSecondaryBorder: 'rgba(66, 22, 27, 0.32)',
  btnDanger: '#581A20',
  btnDangerHover: '#6B222A',

  // Backward-compatibility aliases
  gold: '#67242B',
  goldBright: '#8C323B',
  goldMuted: '#AC6D75',
  goldDark: '#351116',
  borderGold: 'rgba(103, 36, 43, 0.28)',
} as const;
