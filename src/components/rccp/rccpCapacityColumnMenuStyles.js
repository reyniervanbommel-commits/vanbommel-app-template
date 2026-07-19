import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { SUBITEM_CONNECTOR_COLOR } from '../supplier/purchaseOrderSubitemConnectorStyles';

export const useRccpCapacityColumnMenuStyles = makeStyles({
  trigger: {
    minWidth: '22px',
    width: '22px',
    height: '22px',
    ...shorthands.padding('0'),
    color: tokens.colorNeutralForeground3,
    cursor: 'pointer',
    flexShrink: 0,
    opacity: 0,
    pointerEvents: 'none',
    transitionDuration: '0.12s',
    transitionProperty: 'opacity,color,background-color',
    ':hover': {
      color: tokens.colorBrandForeground1,
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  triggerActive: {
    opacity: 1,
    pointerEvents: 'auto',
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1Hover,
    borderRadius: tokens.borderRadiusSmall,
    ':hover': {
      color: tokens.colorBrandForeground1,
      backgroundColor: tokens.colorNeutralBackground2,
    },
  },
  triggerFilterActive: {
    opacity: 1,
    pointerEvents: 'auto',
    color: tokens.colorNeutralForeground1,
    backgroundColor: SUBITEM_CONNECTOR_COLOR,
    borderRadius: tokens.borderRadiusSmall,
    boxShadow: `inset 0 0 0 1px ${SUBITEM_CONNECTOR_COLOR}`,
    ':hover': {
      color: tokens.colorNeutralForeground1,
      backgroundColor: SUBITEM_CONNECTOR_COLOR,
    },
  },
  surface: {
    ...shorthands.padding('0'),
    width: 'auto',
    maxWidth: 'none',
    boxSizing: 'border-box',
  },
  mainPane: {
    width: '256px',
    minWidth: '256px',
    boxSizing: 'border-box',
    ...shorthands.padding('6px', '8px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
  },
  sectionTitle: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  sortActions: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('0'),
  },
  menuButton: {
    justifyContent: 'flex-start',
  },
  menuItemContent: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
  filterBlock: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
  },
  filterValueField: {
    width: '100%',
  },
});
