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
 * - Lage match (<50%) is een waarschuwing maar wel publiceerbaar.
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
        <Text weight="semibold">Verrijkingskolommen ({fieldEntries.length})</Text>
        <div className={styles.tableWrap}>
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Kolom-sleutel</TableHeaderCell>
                <TableHeaderCell>Bron (datasetkolom)</TableHeaderCell>
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
          {validating ? 'Valideren...' : 'Valideren'}
        </Button>
        {published ? (
          <Badge appearance="filled" color="success" size="large">Gepubliceerd</Badge>
        ) : hasDuplicates ? (
          <Badge appearance="filled" color="danger" size="large">Dubbele sleutels</Badge>
        ) : isLowMatch ? (
          <Badge appearance="filled" color="warning" size="large">Lage match</Badge>
        ) : validation ? (
          <Badge appearance="filled" color="success" size="large">Klaar</Badge>
        ) : null}
      </div>

      {validation ? (
        <div className={styles.section}>
          <div className={styles.row}>
            <Text weight="semibold">Match-rate:</Text>
            <Badge appearance="tint" color={isLowMatch ? 'warning' : 'success'} size="small">{ratePct}</Badge>
            <span className={styles.muted}>
              {(validation.matchRate?.matched ?? 0).toLocaleString('nl-NL')} van{' '}
              {(validation.matchRate?.total ?? 0).toLocaleString('nl-NL')} sleutels gematcht
            </span>
          </div>
          {isLowMatch ? (
            <Text className={styles.muted} block>
              Waarschuwing: minder dan de helft van de sleutels matcht. Publiceren blijft mogelijk,
              maar controleer of het juiste sleutelveld gekozen is.
            </Text>
          ) : null}

          <div className={styles.row}>
            <Text weight="semibold">Dubbele sleutels:</Text>
            <Badge appearance="tint" color={hasDuplicates ? 'danger' : 'success'} size="small">
              {(validation.duplicates?.count ?? 0).toLocaleString('nl-NL')}
            </Badge>
          </div>
          {hasDuplicates ? (
            <>
              <Text className={styles.muted} block>
                Publiceren is geblokkeerd zolang de dataset dubbele sleutelwaarden bevat.
                Voorbeelden: {(validation.duplicates?.examples || []).join(', ') || '—'}
              </Text>
            </>
          ) : null}
        </div>
      ) : (
        <Text className={styles.muted} block>Voer eerst een validatie uit voordat je publiceert.</Text>
      )}

      {actionError ? <Text className={styles.error} block>{actionError}</Text> : null}

      <div className={styles.actions}>
        <Button
          appearance="primary"
          disabled={!canPublish}
          icon={publishing ? <Spinner size="tiny" /> : <CheckmarkCircleRegular />}
          onClick={onPublish}
        >
          {publishing ? 'Publiceren...' : 'Publiceren'}
        </Button>
        {published ? (
          <span className={styles.muted}>
            Koppeling aangemaakt{publishResult?.relationId ? ` (relatie ${publishResult.relationId})` : ''}.
          </span>
        ) : null}
      </div>
    </div>
  );
}
