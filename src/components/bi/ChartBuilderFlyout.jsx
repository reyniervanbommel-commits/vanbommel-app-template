import React, { memo } from 'react';
import { Button, makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  flyout: {
    width: '400px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    maxHeight: 'calc(100vh - 120px)',
    position: 'sticky',
    top: '0',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow16,
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    ...shorthands.padding('16px', '16px', '12px'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    flexShrink: 0,
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('8px'),
  },
  title: { fontSize: '16px', fontWeight: 600 },
  actions: {
    display: 'flex',
    ...shorthands.gap('8px'),
    justifyContent: 'flex-end',
  },
  body: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    ...shorthands.padding('0', '16px', '16px'),
  },
});

function ChartBuilderFlyout({ title, onClose, actions, children }) {
  const styles = useStyles();

  return (
    <aside className={styles.flyout} aria-label="Chart settings">
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <Text className={styles.title}>{title}</Text>
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
