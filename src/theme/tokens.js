/**
 * Design token exports for use in JavaScript contexts —
 * primarily Recharts (which requires JS color values, not CSS classes).
 * Single source of truth is tailwind.config.js; keep these in sync.
 */

export const colors = {
  navy:    '#000048',
  cyan:    '#00B5E2',
  success: '#12B76A',
  warning: '#F79009',
  error:   '#F04438',
  info:    '#0BA5EC',
  purple:  '#7C3AED',
  ink: {
    primary:   '#101828',
    secondary: '#475467',
    tertiary:  '#98A2B3',
  },
  border:  '#E4E7EC',
  surface: {
    DEFAULT: '#FFFFFF',
    raised:  '#F2F4F7',
  },
};

/** Recharts-specific palette — use these for all chart strokes/fills */
export const chart = {
  grid:  '#E4E7EC',
  tick:  '#98A2B3',
  // Ordered palette for multi-series charts
  line:  ['#000048', '#00B5E2', '#12B76A', '#F79009', '#F04438', '#7C3AED'],
  area:  ['#000048', '#00B5E2', '#12B76A', '#F79009'],
};

/** Ant Design ConfigProvider theme — applied in App.js */
export const antTheme = {
  token: {
    colorPrimary:          '#000048',
    colorLink:             '#00B5E2',
    colorLinkHover:        '#0099C4',
    colorSuccess:          '#12B76A',
    colorWarning:          '#F79009',
    colorError:            '#F04438',
    colorInfo:             '#0BA5EC',
    colorBgContainer:      '#FFFFFF',
    colorBgLayout:         '#F2F4F7',
    colorBorder:           '#E4E7EC',
    colorBorderSecondary:  '#E4E7EC',
    colorTextBase:         '#101828',
    colorTextSecondary:    '#475467',
    colorTextTertiary:     '#98A2B3',
    colorFillAlter:        '#F2F4F7',
    borderRadius:          4,
    borderRadiusSM:        2,
    borderRadiusLG:        6,
    fontFamily:            "'Inter', 'Segoe UI', 'Roboto', system-ui, sans-serif",
    fontSize:              13,
    fontSizeSM:            11,
    fontSizeLG:            15,
    controlHeight:         34,
    controlHeightSM:       28,
    controlHeightLG:       40,
    lineWidth:             1,
    paddingXS:             6,
    paddingSM:             10,
    padding:               14,
    paddingMD:             16,
    paddingLG:             20,
    motionDurationMid:     '0.15s',
    motionDurationSlow:    '0.2s',
  },
  components: {
    Table: {
      headerBg:            '#F2F4F7',
      headerColor:         '#475467',
      rowHoverBg:          '#F8FAFB',
      cellPaddingBlock:    8,
      cellPaddingInline:   12,
      borderRadius:        4,
    },
    Card: {
      paddingLG:           16,
      borderRadiusLG:      4,
    },
    Modal:   { borderRadiusLG: 6 },
    Drawer:  { borderRadiusLG: 6, paddingLG: 20 },
    Button:  { borderRadius: 4, fontWeight: 600, primaryColor: '#ffffff' },
    Tag:     { borderRadius: 4 },
    Select:  { borderRadius: 4 },
    Input:   { borderRadius: 4 },
    Tooltip: { borderRadius: 4, colorBgSpotlight: '#1E293B' },
    Badge:   { colorPrimary: '#000048' },
    Segmented: { borderRadius: 4, itemSelectedBg: '#000048', itemSelectedColor: '#ffffff' },
    Spin:    { colorPrimary: '#000048' },
    Tabs: {
      inkBarColor:         '#000048',
      itemActiveColor:     '#000048',
      itemSelectedColor:   '#000048',
      itemHoverColor:      '#000048',
    },
    Switch:   { colorPrimary: '#000048' },
    Checkbox: { colorPrimary: '#000048' },
    Radio:    { colorPrimary: '#000048' },
    Progress: { colorSuccess: '#12B76A', defaultColor: '#000048' },
    Alert:    { borderRadiusLG: 4 },
    Message:  { contentBg: '#1E293B', colorText: '#F1F5F9' },
  },
};
