import React, { memo } from 'react';
import { makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  section: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('10px'),
    ...shorthands.padding('12px', '0'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    minWidth: 0,
    ':last-child': {
      ...shorthands.borderBottom('none'),
      paddingBottom: 0,
    },
  },
  title: {
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('10px'),
    minWidth: 0,
    width: '100%',
    '& .fui-Dropdown': { width: '100%', maxWidth: '100%' },
    '& .fui-Input': { width: '100%', maxWidth: '100%' },
  },
});

function ChartBuilderFlyoutSection({ title, children }) {
  const styles = useStyles();

  return (
    <section className={styles.section} aria-label={title}>
      <Text size={200} weight="semibold" className={styles.title}>{title}</Text>
      <div className={styles.content}>{children}</div>
    </section>
  );
}

export default memo(ChartBuilderFlyoutSection);
