import React, { memo, useCallback } from 'react';
import {
  Button, makeStyles, mergeClasses, shorthands, Spinner, Text, tokens,
} from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';
import ChartRenderer from './ChartRenderer';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
    ...shorthands.padding(tokens.spacingVerticalM),
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
  kpiRoot: {
    maxWidth: '132px',
    ...shorthands.padding(tokens.spacingVerticalS),
  },
  kpiBody: {
    aspectRatio: '1 / 1',
    maxHeight: '112px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  titleWrap: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalSNudge),
    minWidth: 0,
  },
  title: {
    fontWeight: tokens.fontWeightSemibold,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  actions: { display: 'flex', ...shorthands.gap(tokens.spacingHorizontalXXS), flexShrink: 0 },
  body: { flexGrow: 1, minHeight: 0, pointerEvents: 'none' },
  loading: { display: 'flex', justifyContent: 'center', ...shorthands.padding(tokens.spacingVerticalXXL) },
});

function ChartCard({
  chart, series, loading, columns, canManage, selected = false,
  onEdit, onDelete, height = 260,
}) {
  const styles = useStyles();
  const isKpi = chart.config?.type === 'kpi';

  const handleCardClick = useCallback(() => {
    if (canManage) onEdit(chart);
  }, [canManage, onEdit, chart]);

  const handleDeleteClick = useCallback((event) => {
    event.stopPropagation();
    onDelete(chart);
  }, [onDelete, chart]);

  return (
    <div
      className={mergeClasses(
        styles.root,
        isKpi && styles.kpiRoot,
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
        </div>
        {canManage ? (
          <div className={styles.actions}>
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
      <div className={mergeClasses(styles.body, isKpi && styles.kpiBody)}>
        {loading ? (
          <div className={styles.loading}><Spinner size="tiny" label="Loading…" /></div>
        ) : (
          <ChartRenderer
            type={chart.config?.type}
            series={series}
            config={chart.config}
            columns={columns}
            height={isKpi ? 112 : height}
          />
        )}
      </div>
    </div>
  );
}

export default memo(ChartCard);
