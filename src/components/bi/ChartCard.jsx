import React, { memo, useCallback } from 'react';
import {
  Badge, Button, makeStyles, mergeClasses, shorthands, Spinner, Text, tokens,
} from '@fluentui/react-components';
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
  rootInteractive: {
    cursor: 'pointer',
    ':hover': {
      ...shorthands.borderColor(tokens.colorBrandStroke1),
      boxShadow: tokens.shadow8,
    },
  },
  rootSelected: {
    ...shorthands.borderColor(tokens.colorBrandStroke1),
    boxShadow: tokens.shadow8,
    backgroundColor: tokens.colorNeutralBackground1Hover,
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...shorthands.gap('8px') },
  titleWrap: { display: 'flex', alignItems: 'center', ...shorthands.gap('6px'), minWidth: 0 },
  title: { fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  actions: { display: 'flex', ...shorthands.gap('2px'), flexShrink: 0 },
  body: { flexGrow: 1, minHeight: 0, pointerEvents: 'none' },
  loading: { display: 'flex', justifyContent: 'center', ...shorthands.padding('24px') },
});

function ChartCard({
  chart, series, loading, columns, canManage, selected = false,
  onEdit, onDelete, height = 260,
}) {
  const styles = useStyles();

  const handleCardClick = useCallback(() => {
    if (canManage) onEdit(chart);
  }, [canManage, onEdit, chart]);

  const handleEditClick = useCallback((event) => {
    event.stopPropagation();
    onEdit(chart);
  }, [onEdit, chart]);

  const handleDeleteClick = useCallback((event) => {
    event.stopPropagation();
    onDelete(chart);
  }, [onDelete, chart]);

  return (
    <div
      className={mergeClasses(
        styles.root,
        canManage && styles.rootInteractive,
        selected && styles.rootSelected,
      )}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (canManage && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onEdit(chart);
        }
      }}
      role={canManage ? 'button' : undefined}
      tabIndex={canManage ? 0 : undefined}
      aria-pressed={canManage ? selected : undefined}
      aria-label={canManage ? `Edit chart ${chart.name}` : chart.name}
    >
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <Text className={styles.title}>{chart.name}</Text>
          {chart.visibility === 'shared' ? <Badge appearance="tint" color="informative">Shared</Badge> : null}
        </div>
        {canManage ? (
          <div className={styles.actions}>
            <Button
              appearance="subtle"
              size="small"
              icon={<EditRegular />}
              aria-label={`Edit ${chart.name}`}
              onClick={handleEditClick}
            />
            <Button
              appearance="subtle"
              size="small"
              icon={<DeleteRegular />}
              aria-label={`Delete ${chart.name}`}
              onClick={handleDeleteClick}
            />
          </div>
        ) : null}
      </div>
      <div className={styles.body}>
        {loading ? (
          <div className={styles.loading}><Spinner size="tiny" label="Loading…" /></div>
        ) : (
          <ChartRenderer type={chart.config?.type} series={series} config={chart.config} columns={columns} height={height} />
        )}
      </div>
    </div>
  );
}

export default memo(ChartCard);
