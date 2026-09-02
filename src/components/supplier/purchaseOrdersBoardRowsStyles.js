import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { poTableZoomedPx } from '../../utils/poTableZoom';
import {
  purchaseOrderBoardControlColumnWidth,
  purchaseOrderBoardHeaderHeight,
  purchaseOrderBoardRowHeight,
} from './purchaseOrderBoardLayout';
import { SUBITEM_CONNECTOR_COLOR } from './purchaseOrderSubitemConnectorStyles';

const fixedCellOverflow = {
  boxSizing: 'border-box',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
};

export const usePurchaseOrdersBoardRowsStyles = makeStyles({
  groupRowCell: {
    position: 'sticky',
    top: purchaseOrderBoardHeaderHeight,
    zIndex: 4,
    backgroundColor: '#f4e6ed',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('0'),
    verticalAlign: 'middle',
    // Geen transform op sticky-top element: GPU-layer op een verticaal-sticky element
    // kan een visuele frame-vertraging geven waardoor de header lijkt mee te scrollen.
  },
  groupButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('3px', '12px'),
    backgroundColor: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  groupCollapseButton: {
    width: '24px',
    height: '24px',
    minWidth: '24px',
    minHeight: '24px',
    ...shorthands.padding('0'),
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  groupDot: {
    color: '#c02f64',
    fontSize: '12px',
    lineHeight: '12px',
  },
  groupRowInner: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    width: '100%',
  },
  groupCheckbox: {
    ...shorthands.padding('0'),
    marginLeft: '6px',
  },
  itemRow: {
    contentVisibility: 'auto',
    containIntrinsicSize: `auto ${purchaseOrderBoardRowHeight}`,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  removedRow: {
    backgroundColor: tokens.colorNeutralBackgroundDisabled,
  },
  controlCell: {
    position: 'sticky',
    left: 0,
    zIndex: 3,
    width: purchaseOrderBoardControlColumnWidth,
    minWidth: purchaseOrderBoardControlColumnWidth,
    maxWidth: purchaseOrderBoardControlColumnWidth,
    height: purchaseOrderBoardRowHeight,
    maxHeight: purchaseOrderBoardRowHeight,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('0', '2px'),
    textAlign: 'center',
    boxSizing: 'border-box',
    overflow: 'visible',
    verticalAlign: 'middle',
    // B4: GPU compositor layer — hardware scroll i.p.v. CPU-repaint
    transform: 'translateZ(0)',
  },
  controlCellInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 0,
    height: '100%',
    maxHeight: purchaseOrderBoardRowHeight,
    overflow: 'visible',
  },
  rowControlsCluster: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('0'),
    flexShrink: 0,
    maxHeight: '100%',
    overflow: 'visible',
  },
  rowCheckbox: {
    ...shorthands.padding('0'),
    marginRight: '-2px',
    flexShrink: 0,
  },
  rowStatusBadge: {
    marginLeft: '2px',
    flexShrink: 0,
  },
  compactToggleButton: {
    minWidth: '18px',
    width: '18px',
    height: '18px',
    minHeight: '18px',
    ...shorthands.padding('0'),
    marginLeft: '-1px',
    flexShrink: 0,
  },
  itemCell: {
    '--po-cell-padding-y': poTableZoomedPx(2),
    '--po-cell-padding-x': poTableZoomedPx(10),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding(poTableZoomedPx(2), poTableZoomedPx(10)),
    height: purchaseOrderBoardRowHeight,
    maxHeight: purchaseOrderBoardRowHeight,
    fontSize: `calc(${tokens.fontSizeBase300} * var(--po-table-zoom, 0.85))`,
    color: tokens.colorNeutralForeground1,
    // A4: layout-isolatie per cel — voorkomt reflow-cascade bij ~500 cellen
    contain: 'layout',
    ...fixedCellOverflow,
    // overflow blijft hidden zodat de celrand (kader) niet wordt overschilderd
    // door status-fill of het history-hoekje.
  },
  itemCellContent: {
    display: 'block',
    minWidth: 0,
    maxWidth: '100%',
    height: '100%',
    maxHeight: `calc(${purchaseOrderBoardRowHeight} - 4px)`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: `calc(${purchaseOrderBoardRowHeight} - 6px)`,
    ':has([data-cell-history-trigger="true"])': {
      overflow: 'visible',
    },
  },
  newRow: {
    boxShadow: `inset 3px 0 0 0 ${tokens.colorPaletteGreenBorderActive}`,
  },
  changedRow: {
    boxShadow: `inset 3px 0 0 0 ${tokens.colorPaletteMarigoldBorderActive}`,
  },
  locateHighlightControlCell: {
    backgroundColor: '#fff4ce',
  },
  subitemsContainer: {
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding('10px', '8px', '10px', '28px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    position: 'relative',
    '::before': {
      content: '""',
      position: 'absolute',
      left: '37px',
      top: 0,
      width: '2px',
      height: '12px',
      backgroundColor: SUBITEM_CONNECTOR_COLOR,
    },
  },
  // Sticky zodat de spinner zichtbaar blijft bij horizontaal scrollen van de tabel.
  spinnerWrapper: {
    position: 'sticky',
    left: '16px',
    display: 'inline-block',
  },
});
