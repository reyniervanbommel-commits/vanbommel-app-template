import React, { memo } from 'react';
import { Button, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  flyout: {
    width: '340px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    alignSelf: 'stretch',
    position: 'sticky',
    top: '0',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderLeft('1px', 'solid', tokens.colorNeutralStroke2),
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    ...shorthands.padding('12px', '12px', '10px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    flexShrink: 0,
  },
  headerTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    ...shorthands.gap('8px'),
  },
  nameWrap: { flex: 1, minWidth: 0, overflow: 'hidden' },
  actions: {
    display: 'flex',
    ...shorthands.gap('6px'),
    justifyContent: 'flex-end',
  },
  body: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    ...shorthands.padding('0', '16px', '16px'),
  },
});

function ChartBuilderFlyout({ onClose, actions, nameField, children }) {
  const styles = useStyles();

  return (
    <aside className={styles.flyout} aria-label="Chart settings">
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.nameWrap}>{nameField}</div>
          <Button
            appearance="subtle"
            size="small"
            icon={<DismissRegular />}
            aria-label="Close chart settings"
            onClick={onClose}
          />
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      <div className={styles.body}>{children}</div>
    </aside>
  );
}

export default memo(ChartBuilderFlyout);
