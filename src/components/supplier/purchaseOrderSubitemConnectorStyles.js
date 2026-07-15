import { makeStyles, shorthands } from '@fluentui/react-components';

export const SUBITEM_CONNECTOR_COLOR = '#E8A800';
const CONNECTOR_X = '9px';
const CONNECTOR_BRANCH_WIDTH = '13px';

export const useSubitemConnectorStyles = makeStyles({
  connectorHeaderCell: {
    width: '22px',
    minWidth: '22px',
    maxWidth: '22px',
    ...shorthands.padding('0'),
    position: 'relative',
    verticalAlign: 'middle',
    backgroundColor: 'transparent',
    ...shorthands.border('0'),
    '::before': {
      content: '""',
      position: 'absolute',
      left: CONNECTOR_X,
      top: '-2px',
      bottom: 0,
      width: '2px',
      backgroundColor: SUBITEM_CONNECTOR_COLOR,
    },
  },
  connectorCell: {
    width: '22px',
    minWidth: '22px',
    maxWidth: '22px',
    ...shorthands.padding('0'),
    position: 'relative',
    verticalAlign: 'middle',
    backgroundColor: 'transparent',
    ...shorthands.border('0'),
    '::before': {
      content: '""',
      position: 'absolute',
      left: CONNECTOR_X,
      top: '-1px',
      bottom: 0,
      width: '2px',
      backgroundColor: SUBITEM_CONNECTOR_COLOR,
    },
    '::after': {
      content: '""',
      position: 'absolute',
      left: CONNECTOR_X,
      top: '50%',
      width: CONNECTOR_BRANCH_WIDTH,
      height: '12px',
      marginTop: '-1px',
      borderLeft: `2px solid ${SUBITEM_CONNECTOR_COLOR}`,
      borderBottom: `2px solid ${SUBITEM_CONNECTOR_COLOR}`,
      borderBottomLeftRadius: '6px',
      boxSizing: 'border-box',
    },
  },
  connectorCellTrunkEnd: {
    '::before': { bottom: '50%' },
  },
  connectorCellOnly: {
    '::before': { top: '50%', bottom: '50%', height: '2px' },
  },
  connectorTotalsCell: {
    width: '22px',
    minWidth: '22px',
    maxWidth: '22px',
    ...shorthands.padding('0'),
    position: 'relative',
    verticalAlign: 'middle',
    backgroundColor: 'transparent',
    ...shorthands.border('0'),
    '::before': {
      content: '""',
      position: 'absolute',
      left: CONNECTOR_X,
      top: '-1px',
      bottom: '50%',
      width: '2px',
      backgroundColor: SUBITEM_CONNECTOR_COLOR,
    },
    '::after': {
      content: '""',
      position: 'absolute',
      left: CONNECTOR_X,
      top: '50%',
      width: CONNECTOR_BRANCH_WIDTH,
      height: '12px',
      marginTop: '-1px',
      borderLeft: `2px solid ${SUBITEM_CONNECTOR_COLOR}`,
      borderBottom: `2px solid ${SUBITEM_CONNECTOR_COLOR}`,
      borderBottomLeftRadius: '6px',
      boxSizing: 'border-box',
    },
  },
});

export function resolveSubitemConnectorCellClassName({
  index,
  rowCount,
  hasTotalsRow,
  styles,
}) {
  const classes = [styles.connectorCell];
  const isLastBodyRow = index === rowCount - 1;
  const isOnlyRow = rowCount === 1 && !hasTotalsRow;

  if (isOnlyRow) classes.push(styles.connectorCellOnly);
  else if (isLastBodyRow && !hasTotalsRow) {
    classes.push(styles.connectorCellTrunkEnd);
  }
  return classes.filter(Boolean).join(' ');
}
