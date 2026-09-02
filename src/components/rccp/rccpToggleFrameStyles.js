import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

/** Match Fluent `Button size="small"` (week picker) so the frames sit on one baseline. */
const COMPACT_CONTROL_HEIGHT = tokens.spacingVerticalXXL;

export const useRccpToggleFrameStyles = makeStyles({
  frame: {
    display: 'inline-flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    height: COMPACT_CONTROL_HEIGHT,
    minHeight: COMPACT_CONTROL_HEIGHT,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusMedium,
    ...shorthands.padding(0, tokens.spacingHorizontalXS),
  },
  group: {
    display: 'flex',
    alignItems: 'center',
    columnGap: tokens.spacingHorizontalXS,
    '& .fui-Radio__indicator': {
      marginTop: 0,
      marginBottom: 0,
      marginLeft: tokens.spacingHorizontalXXS,
      marginRight: tokens.spacingHorizontalXXS,
    },
    '& .fui-Radio__label': {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: tokens.spacingHorizontalXXS,
      paddingRight: tokens.spacingHorizontalXS,
      fontSize: tokens.fontSizeBase200,
      lineHeight: tokens.lineHeightBase200,
    },
  },
});
