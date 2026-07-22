import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { SUBITEM_CONNECTOR_COLOR } from './purchaseOrderSubitemConnectorStyles';

export const usePurchaseOrdersBoardTableStyles = makeStyles({
  wrapper: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
    height: '100%',
    minHeight: 0,
    overflow: 'auto',
    overflowX: 'scroll',
    scrollbarGutter: 'stable',
  },
  table: {
    width: 'max-content',
    borderCollapse: 'separate',
    borderSpacing: 0,
    minWidth: '100%',
    tableLayout: 'fixed',
  },
  headerCell: {
    backgroundColor: tokens.colorNeutralBackground2,
    position: 'sticky',
    top: 0,
    zIndex: 2,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('10px', '12px'),
    textAlign: 'left',
    fontWeight: tokens.fontWeightRegular,
    fontSize: tokens.fontSizeBase300,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    ':hover [data-column-menu-trigger="true"]': {
      opacity: 1,
      pointerEvents: 'auto',
    },
    ':focus-within [data-column-menu-trigger="true"]': {
      opacity: 1,
      pointerEvents: 'auto',
    },
    ':has([data-column-menu-trigger-active="true"]) [data-column-menu-trigger="true"]': {
      opacity: 1,
      pointerEvents: 'auto',
    },
  },
  headerCellFiltered: {
    boxShadow: `inset 0 -3px 0 0 ${SUBITEM_CONNECTOR_COLOR}`,
  },
  dragDropCell: { cursor: 'grab' },
  dragSourceCell: { opacity: 0.6 },
  dropBeforeCell: { '::before': { content: '""', position: 'absolute', left: '-2px', top: '-1px', bottom: '-1px', width: '4px', backgroundColor: tokens.colorStrokeFocus2, zIndex: 6 } },
  dropAfterCell: { '::after': { content: '""', position: 'absolute', right: '-2px', top: '-1px', bottom: '-1px', width: '4px', backgroundColor: tokens.colorStrokeFocus2, zIndex: 6 } },
  headerCellContent: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 0, overflow: 'hidden', ...shorthands.gap('6px') },
  headerCellLabel: {
    flexGrow: 1,
    minWidth: 0,
  },
  empty: {
    ...shorthands.padding('16px'),
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
  emptyFilterCell: {
    ...shorthands.padding('24px', '16px'),
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
  },
  emptyFilterContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ...shorthands.gap('8px'),
  },
});
