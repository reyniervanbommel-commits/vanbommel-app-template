import React from 'react';
import {
  Badge,
  Button,
  Spinner,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { ArrowLeftRegular, ArrowRightRegular, ArrowResetRegular } from '@fluentui/react-icons';
import { useExcelLinkWizard } from '../../../hooks/useExcelLinkWizard';
import StepUpload from './excel-link/StepUpload';
import StepKeys from './excel-link/StepKeys';
import StepColumns from './excel-link/StepColumns';
import StepPublish from './excel-link/StepPublish';
import ExistingLinksList from './excel-link/ExistingLinksList';

const STEPS = [
  { n: 1, label: 'Upload file' },
  { n: 2, label: 'Link keys' },
  { n: 3, label: 'Choose columns' },
  { n: 4, label: 'Validate & publish' },
];

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap('20px'), width: '100%' },
  intro: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  error: { color: tokens.colorPaletteRedForeground1 },
  stepper: { display: 'flex', alignItems: 'center', ...shorthands.gap('8px'), flexWrap: 'wrap' },
  stepButton: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('6px', '12px'),
    ...shorthands.borderRadius('6px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground1,
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
    ':disabled': { cursor: 'not-allowed', color: tokens.colorNeutralForegroundDisabled },
  },
  stepActive: {
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.border('1px', 'solid', tokens.colorBrandStroke1),
    color: tokens.colorBrandForeground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  panel: {
    ...shorthands.padding('4px', '0'),
    minHeight: '120px',
  },
  nav: { display: 'flex', alignItems: 'center', ...shorthands.gap('12px'), flexWrap: 'wrap' },
  spacer: { flexGrow: 1 },
});

/**
 * 4-staps wizard "External links": koppelt een Excel/CSV-dataset als read-only
 * verrijkingskolommen aan een hoofdtabel (story #166). Statusbadges via Fluent Badge.
 */
export default function ExcelLinkWizard() {
  const styles = useStyles();
  const w = useExcelLinkWizard();

  const goNext = () => w.goToStep(w.step + 1);
  const goPrev = () => w.goToStep(w.step - 1);

  return (
    <div className={styles.root}>
      <div>
        <Text size={500} weight="semibold" block>External links</Text>
        <Text className={styles.intro} block>
          Upload an Excel or CSV file and link it to a main table via a key field.
          The selected columns appear as read-only enrichment columns.
        </Text>
      </div>

      <div className={styles.stepper}>
        {STEPS.map((s) => {
          const reachable = w.canGoTo(s.n);
          const active = w.step === s.n;
          return (
            <button
              key={s.n}
              type="button"
              className={`${styles.stepButton} ${active ? styles.stepActive : ''}`}
              disabled={!reachable}
              onClick={() => w.goToStep(s.n)}
            >
              <Badge
                appearance={active ? 'filled' : 'outline'}
                color={active ? 'brand' : 'informative'}
                size="small"
              >
                {s.n}
              </Badge>
              {s.label}
            </button>
          );
        })}
      </div>

      {w.refError ? <Text className={styles.error} block>{w.refError}</Text> : null}

      <div className={styles.panel}>
        {w.refLoading ? (
          <Spinner label="Loading..." />
        ) : w.step === 1 ? (
          <StepUpload
            dataset={w.dataset}
            uploading={w.uploading}
            uploadError={w.uploadError}
            onUpload={w.uploadFile}
          />
        ) : w.step === 2 ? (
          <StepKeys
            mainTables={w.mainTables}
            dataset={w.dataset}
            selectedMainTable={w.selectedMainTable}
            scopeColumns={w.scopeColumns}
            mainTableKey={w.mainTableKey}
            onMainTableKey={w.setMainTableKey}
            sourceScope={w.sourceScope}
            onSourceScope={w.setSourceScope}
            mainKeyField={w.mainKeyField}
            onMainKeyField={w.setMainKeyField}
            datasetKeyField={w.datasetKeyField}
            onDatasetKeyField={w.setDatasetKeyField}
          />
        ) : w.step === 3 ? (
          <StepColumns
            dataset={w.dataset}
            datasetKeyField={w.datasetKeyField}
            selectedColumns={w.selectedColumns}
            derivedKeys={w.derivedKeys}
            onToggle={w.toggleColumn}
            onDerivedKey={w.setDerivedKey}
          />
        ) : (
          <StepPublish
            fieldsMap={w.fieldsMap}
            validation={w.validation}
            validating={w.validating}
            onValidate={w.validate}
            publishResult={w.publishResult}
            publishing={w.publishing}
            onPublish={w.publish}
            actionError={w.actionError}
          />
        )}
      </div>

      <div className={styles.nav}>
        <Button
          appearance="secondary"
          icon={<ArrowLeftRegular />}
          disabled={w.step <= 1}
          onClick={goPrev}
        >
          Previous
        </Button>
        <Button
          appearance="secondary"
          icon={<ArrowResetRegular />}
          onClick={w.reset}
        >
          Start over
        </Button>
        <div className={styles.spacer} />
        <Button
          appearance="primary"
          icon={<ArrowRightRegular />}
          iconPosition="after"
          disabled={w.step >= 4 || !w.canGoTo(w.step + 1)}
          onClick={goNext}
        >
          Next
        </Button>
      </div>

      <ExistingLinksList links={w.links} onDelete={w.deleteLink} />
    </div>
  );
}
