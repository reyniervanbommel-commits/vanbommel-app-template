import React, { useCallback } from 'react';
import {
  Button,
  Field,
  Input,
  Spinner,
  Text,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular, Save24Regular } from '@fluentui/react-icons';
import AdminInfoHint from './AdminInfoHint';
import { D365_REFRESH_INFO } from './d365RefreshInfoCopy';
import D365RefreshLivePanel from './D365RefreshLivePanel';
import D365RefreshHistory from './D365RefreshHistory';
import { useD365Refresh } from '../../hooks/useD365Refresh';

const useStyles = makeStyles({
  root: { maxWidth: '760px', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  header: { display: 'flex', alignItems: 'center', ...shorthands.gap('4px') },
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
  actions: { display: 'flex', ...shorthands.gap('12px'), alignItems: 'center', flexWrap: 'wrap' },
  emailField: { maxWidth: '400px' },
  error: { color: tokens.colorPaletteRedForeground1 },
  feedback: { color: tokens.colorPaletteGreenForeground1 },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

export default function AdminD365Refresh() {
  const styles = useStyles();
  const model = useD365Refresh();
  const onEmailsChange = useCallback((event) => {
    model.setEmails(event.target.value);
  }, [model]);

  if (model.loading) {
    return <Spinner label="Loading D365 refresh" />;
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text weight="semibold">D365 refresh</Text>
        <AdminInfoHint text={D365_REFRESH_INFO} />
      </div>

      <div className={styles.section}>
        <Text weight="semibold">Live run</Text>
        <div className={styles.actions}>
          <Button
            appearance="primary"
            icon={model.running || model.starting ? <Spinner size="tiny" /> : <ArrowClockwiseRegular />}
            onClick={model.startRefresh}
            disabled={model.running || model.starting}
          >
            Start
          </Button>
        </div>
        <D365RefreshLivePanel run={model.run} />
      </div>

      <div className={styles.section}>
        <Text weight="semibold">Night alert emails</Text>
        <Text className={styles.hint}>Used only when a night run fails, is interrupted, or an entity fails.</Text>
        <Field label="Alert emails" className={styles.emailField}>
          <Input value={model.emails} onChange={onEmailsChange} style={{ maxWidth: '400px' }} />
        </Field>
        <div className={styles.actions}>
          <Button appearance="secondary" icon={<Save24Regular />} onClick={model.saveEmails} disabled={model.savingEmails}>
            Save
          </Button>
        </div>
      </div>

      <div className={styles.section}>
        <Text weight="semibold">History</Text>
        <D365RefreshHistory runs={model.history} />
      </div>

      {model.error ? <Text className={styles.error}>{model.error}</Text> : null}
      {model.feedback ? <Text className={styles.feedback}>{model.feedback}</Text> : null}
    </div>
  );
}
