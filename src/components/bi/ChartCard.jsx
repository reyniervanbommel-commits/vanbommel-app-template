import React, { memo } from 'react';
import { Badge, Button, makeStyles, shorthands, Spinner, Text, tokens } from '@fluentui/react-components';
import { DeleteRegular, EditRegular } from '@fluentui/react-icons';
import ChartRenderer from './ChartRenderer';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow4,
    minHeight: 0,
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...shorthands.gap('8px') },
  titleWrap: { display: 'flex', alignItems: 'center', ...shorthands.gap('6px'), minWidth: 0 },
  title: { fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  actions: { display: 'flex', ...shorthands.gap('2px'), flexShrink: 0 },
  body: { flexGrow: 1, minHeight: 0 },
  loading: { display: 'flex', justifyContent: 'center', ...shorthands.padding('24px') },
});

function ChartCard({ chart, series, loading, canManage, onEdit, onDelete, height = 260 }) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <Text className={styles.title}>{chart.name}</Text>
          {chart.visibility === 'shared' ? <Badge appearance="tint" color="informative">Shared</Badge> : null}
        </div>
        {canManage ? (
          <div className={styles.actions}>
            <Button appearance="subtle" size="small" icon={<EditRegular />} aria-label={`Edit ${chart.name}`} onClick={() => onEdit(chart)} />
            <Button appearance="subtle" size="small" icon={<DeleteRegular />} aria-label={`Delete ${chart.name}`} onClick={() => onDelete(chart)} />
          </div>
        ) : null}
      </div>
      <div className={styles.body}>
        {loading ? (
          <div className={styles.loading}><Spinner size="tiny" label="Loading…" /></div>
        ) : (
          <ChartRenderer type={chart.config?.type} series={series} height={height} />
        )}
      </div>
    </div>
  );
}

export default memo(ChartCard);
