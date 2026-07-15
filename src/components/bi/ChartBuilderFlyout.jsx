import React, { memo } from 'react';
import { Button, makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  flyout: {
    width: '340px',
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
  nameWrap: { flex: 1, minWidth: 0 },
  title: { fontSize: '11px', fontWeight: 600, color: tokens.colorNeutralForeground3, marginBottom: '4px' },
  actions: {
    display: 'flex',
    ...shorthands.gap('6px'),
    justifyContent: 'flex-end',
  },
  body: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    ...shorthands.padding('0', '12px', '12px'),
  },
});

function ChartBuilderFlyout({ title, onClose, actions, nameField, children }) {
  const styles = useStyles();

  return (
    <aside className={styles.flyout} aria-label="Chart settings">
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.nameWrap}>
            {nameField ? (
              <>
                <Text className={styles.title}>Chart name</Text>
                {nameField}
              </>
            ) : (
              <Text className={styles.title}>{title}</Text>
            )}
          </div>
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
