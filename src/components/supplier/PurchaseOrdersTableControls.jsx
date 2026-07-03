import React, { memo } from 'react';
import { Button, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import {
  ArrowCollapseAll20Regular,
  ArrowExpandAll20Regular,
  PanelBottomContract20Regular,
  PanelBottomExpand20Regular,
  TableSimple20Regular,
  TextBulletList20Regular,
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  controlHeaderCell: {
    backgroundColor: tokens.colorNeutralBackground2,
    position: 'sticky',
    top: 0,
    zIndex: 2,
    width: '96px',
    minWidth: '96px',
    maxWidth: '96px',
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('6px', '8px'),
    textAlign: 'center',
    whiteSpace: 'nowrap',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.gap('2px'),
  },
  button: {
    minWidth: '24px',
    width: '24px',
    height: '24px',
    ...shorthands.padding('0'),
  },
});

function PurchaseOrdersTableControls({
  allGroupsCollapsed,
  allSubgroupsCollapsed,
  headersOnly,
  onToggleAllGroups,
  onToggleAllSubgroups,
  onToggleHeadersOnly,
}) {
  const styles = useStyles();

  return (
    <th className={styles.controlHeaderCell} aria-label="Table display controls">
      <div className={styles.toolbar}>
        <Button
          size="small"
          appearance="subtle"
          className={styles.button}
          icon={allGroupsCollapsed ? <ArrowExpandAll20Regular /> : <ArrowCollapseAll20Regular />}
          onClick={onToggleAllGroups}
          title={allGroupsCollapsed ? 'Expand all groups' : 'Collapse all groups'}
          aria-label={allGroupsCollapsed ? 'Expand all groups' : 'Collapse all groups'}
        />
        <Button
          size="small"
          appearance="subtle"
          className={styles.button}
          icon={allSubgroupsCollapsed ? <PanelBottomExpand20Regular /> : <PanelBottomContract20Regular />}
          onClick={onToggleAllSubgroups}
          title={allSubgroupsCollapsed ? 'Expand all subitems' : 'Collapse all subitems'}
          aria-label={allSubgroupsCollapsed ? 'Expand all subitems' : 'Collapse all subitems'}
        />
        <Button
          size="small"
          appearance={headersOnly ? 'primary' : 'subtle'}
          className={styles.button}
          icon={headersOnly ? <TableSimple20Regular /> : <TextBulletList20Regular />}
          onClick={onToggleHeadersOnly}
          title={headersOnly ? 'Show rows' : 'Show headers only'}
          aria-label={headersOnly ? 'Show rows' : 'Show headers only'}
        />
      </div>
    </th>
  );
}

export default memo(PurchaseOrdersTableControls);
