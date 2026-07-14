import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const SUBITEM_CONNECTOR_COLOR = '#c02f64';
const CONNECTOR_X = '9px';

export const useSubitemConnectorStyles = makeStyles({
  connectorHeaderCell: {
    width: '22px',
    minWidth: '22px',
    maxWidth: '22px',
    ...shorthands.padding('0'),
    position: 'relative',
    verticalAlign: 'middle',
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    '::before': {
      content: '""',
      position: 'absolute',
      left: CONNECTOR_X,
      top: 0,
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
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    '::before': {
      content: '""',
      position: 'absolute',
      left: CONNECTOR_X,
      top: 0,
      bottom: 0,
      width: '2px',
      backgroundColor: SUBITEM_CONNECTOR_COLOR,
    },
    '::after': {
      content: '""',
      position: 'absolute',
      left: CONNECTOR_X,
      top: '50%',
      transform: 'translateY(-1px)',
      width: '12px',
      height: '12px',
      borderLeft: `2px solid ${SUBITEM_CONNECTOR_COLOR}`,
      borderBottom: `2px solid ${SUBITEM_CONNECTOR_COLOR}`,
      borderBottomLeftRadius: '6px',
      boxSizing: 'border-box',
    },
  },
  connectorCellTrunkStart: {
    '::before': { top: '50%' },
  },
  connectorCellTrunkEnd: {
    '::before': { bottom: '50%' },
    '::after': { display: 'none' },
  },
  connectorCellOnly: {
    '::before': { top: '50%', bottom: '50%' },
  },
  connectorTotalsCell: {
    width: '22px',
    minWidth: '22px',
    maxWidth: '22px',
    ...shorthands.padding('0'),
    position: 'relative',
    verticalAlign: 'middle',
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderTop('2px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    '::before': {
      content: '""',
      position: 'absolute',
      left: CONNECTOR_X,
      top: 0,
      bottom: '50%',
      width: '2px',
      backgroundColor: SUBITEM_CONNECTOR_COLOR,
    },
    '::after': {
      content: '""',
      position: 'absolute',
      left: CONNECTOR_X,
      top: '50%',
      transform: 'translateY(-1px)',
      width: '12px',
      height: '12px',
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
  const isFirst = index === 0;
  const isLastBodyRow = index === rowCount - 1;
  const isOnlyRow = rowCount === 1 && !hasTotalsRow;

  if (isOnlyRow) classes.push(styles.connectorCellOnly);
  else {
    if (isFirst) classes.push(styles.connectorCellTrunkStart);
    if (isLastBodyRow && !hasTotalsRow) classes.push(styles.connectorCellTrunkEnd);
  }
  return classes.filter(Boolean).join(' ');
}
