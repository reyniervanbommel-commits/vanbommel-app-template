import React, { useMemo } from 'react';
import {
  Badge,
  Button,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { CheckmarkCircleRegular } from '@fluentui/react-icons';

const LOW_MATCH_THRESHOLD = 0.5;

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap('16px'), maxWidth: '640px' },
  actions: { display: 'flex', alignItems: 'center', ...shorthands.gap('12px'), flexWrap: 'wrap' },
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('16px', '20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('10px'),
  },
  row: { display: 'flex', alignItems: 'center', ...shorthands.gap('8px'), flexWrap: 'wrap' },
  muted: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  mono: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200 },
  error: { color: tokens.colorPaletteRedForeground1 },
  tableWrap: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius('6px'),
  },
});

/**
 * Stap 4: valideren & publiceren.
 * - Publiceren disabled bij duplicaten (hard-fail) of terwijl bezig.
 * - Low match (<50%) is een waarschuwing maar wel publiceerbaar.
 */
export default function StepPublish({
  fieldsMap,
  validation,
  validating,
  onValidate,
  publishResult,
  publishing,
  onPublish,
  actionError,
}) {
  const styles = useStyles();

  const hasDuplicates = (validation?.duplicates?.count || 0) > 0;
  const rate = validation?.matchRate?.rate ?? null;
  const isLowMatch = rate !== null && rate < LOW_MATCH_THRESHOLD;
  const published = Boolean(publishResult?.published);

  const ratePct = useMemo(
    () => (rate === null ? '—' : `${Math.round(rate * 100)}%`),
    [rate],
  );

  const fieldEntries = Object.entries(fieldsMap || {});
  const canPublish = Boolean(validation) && !hasDuplicates && !publishing && !published;

  return (
    <div className={styles.root}>
      <div className={styles.section}>
        <Text weight="semibold">Enrichment columns ({fieldEntries.length})</Text>
        <div className={styles.tableWrap}>
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Column key</TableHeaderCell>
                <TableHeaderCell>Source (dataset column)</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieldEntries.map(([derived, source]) => (
                <TableRow key={derived}>
                  <TableCell><span className={styles.mono}>{derived}</span></TableCell>
                  <TableCell><span className={styles.mono}>{source}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className={styles.actions}>
        <Button
          appearance="secondary"
          disabled={validating}
          icon={validating ? <Spinner size="tiny" /> : undefined}
          onClick={onValidate}
        >
          {validating ? 'Validating...' : 'Validate'}
        </Button>
        {published ? (
          <Badge appearance="filled" color="success" size="large">Published</Badge>
        ) : hasDuplicates ? (
          <Badge appearance="filled" color="danger" size="large">Duplicate keys</Badge>
        ) : isLowMatch ? (
          <Badge appearance="filled" color="warning" size="large">Low match</Badge>
        ) : validation ? (
          <Badge appearance="filled" color="success" size="large">Ready</Badge>
        ) : null}
      </div>

      {validation ? (
        <div className={styles.section}>
          <div className={styles.row}>
            <Text weight="semibold">Match rate:</Text>
            <Badge appearance="tint" color={isLowMatch ? 'warning' : 'success'} size="small">{ratePct}</Badge>
            <span className={styles.muted}>
              {(validation.matchRate?.matched ?? 0).toLocaleString('en-US')} of{' '}
              {(validation.matchRate?.total ?? 0).toLocaleString('en-US')} keys matched
            </span>
          </div>
          {isLowMatch ? (
            <Text className={styles.muted} block>
              Warning: fewer than half of the keys match. Publishing is still allowed,
              but verify that the correct key field was selected.
            </Text>
          ) : null}

          <div className={styles.row}>
            <Text weight="semibold">Duplicate keys:</Text>
            <Badge appearance="tint" color={hasDuplicates ? 'danger' : 'success'} size="small">
              {(validation.duplicates?.count ?? 0).toLocaleString('nl-NL')}
            </Badge>
          </div>
          {hasDuplicates ? (
            <>
              <Text className={styles.muted} block>
                Publishing is blocked while the dataset contains duplicate key values.
                Examples: {(validation.duplicates?.examples || [])
                  .map((e) => `${e.value} (${e.count}×)`).join(', ') || '—'}
              </Text>
            </>
          ) : null}
        </div>
      ) : (
        <Text className={styles.muted} block>Run validation first before publishing.</Text>
      )}

      {actionError ? <Text className={styles.error} block>{actionError}</Text> : null}

      <div className={styles.actions}>
        <Button
          appearance="primary"
          disabled={!canPublish}
          icon={publishing ? <Spinner size="tiny" /> : <CheckmarkCircleRegular />}
          onClick={onPublish}
        >
          {publishing ? 'Publishing...' : 'Publish'}
        </Button>
        {published ? (
          <span className={styles.muted}>
            Link created{publishResult?.relationId ? ` (relatie ${publishResult.relationId})` : ''}.
          </span>
        ) : null}
      </div>
    </div>
  );
}
