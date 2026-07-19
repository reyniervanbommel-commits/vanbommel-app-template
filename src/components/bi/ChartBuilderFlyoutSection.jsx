import React, { memo } from 'react';
import { makeStyles, shorthands, Text, tokens, useId } from '@fluentui/react-components';

const useStyles = makeStyles({
  section: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalMNudge),
    ...shorthands.padding(tokens.spacingVerticalM, '0'),
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
    ...shorthands.gap(tokens.spacingVerticalMNudge),
    minWidth: 0,
    width: '100%',
    '& .fui-Dropdown': { width: '100%', maxWidth: '100%' },
    '& .fui-Input': { width: '100%', maxWidth: '100%' },
  },
});

function ChartBuilderFlyoutSection({ title, children }) {
  const styles = useStyles();
  const titleId = useId('bi-section-');

  return (
    <section className={styles.section} aria-labelledby={titleId}>
      <Text id={titleId} size={200} weight="semibold" className={styles.title}>{title}</Text>
      <div className={styles.content}>{children}</div>
    </section>
  );
}

export default memo(ChartBuilderFlyoutSection);
