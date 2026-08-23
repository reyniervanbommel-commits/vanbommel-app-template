import React from 'react';
import {
  Button,
  Spinner,
  Text,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular } from '@fluentui/react-icons';
import AdminInfoHint from './AdminInfoHint';
import { D365_REFRESH_INFO, D365_REFRESH_SERVER_HINT } from './d365RefreshInfoCopy';
import D365RefreshLivePanel from './D365RefreshLivePanel';
import D365RefreshHistory from './D365RefreshHistory';
import D365RefreshAlertEmails from './D365RefreshAlertEmails';
import D365RefreshFold from './D365RefreshFold';
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
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  error: { color: tokens.colorPaletteRedForeground1 },
  feedback: { color: tokens.colorPaletteGreenForeground1 },
});

export default function AdminD365Refresh() {
  const styles = useStyles();
  const model = useD365Refresh();

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
        <Text className={styles.hint}>{D365_REFRESH_SERVER_HINT}</Text>
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

      <D365RefreshFold title="Night alert emails" defaultOpen={false}>
        <D365RefreshAlertEmails
          emails={model.emails}
          onChange={model.setEmails}
          onSave={model.saveEmails}
          saving={model.savingEmails}
        />
      </D365RefreshFold>

      <D365RefreshFold title="History" defaultOpen>
        <D365RefreshHistory runs={model.history} />
      </D365RefreshFold>

      {model.error ? <Text className={styles.error}>{model.error}</Text> : null}
      {model.feedback ? <Text className={styles.feedback}>{model.feedback}</Text> : null}
    </div>
  );
}
