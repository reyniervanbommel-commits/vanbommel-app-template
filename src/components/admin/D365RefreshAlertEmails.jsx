import React, { memo, useCallback, useState } from 'react';
import {
  Button,
  Field,
  Input,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { Save24Regular } from '@fluentui/react-icons';
import D365RefreshAlertEmailChip from './D365RefreshAlertEmailChip';
import { isValidAlertEmail, mergeAlertEmails, parseAlertEmails } from '../../utils/alertEmails';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('8px'),
  },
  addRow: {
    display: 'flex',
    ...shorthands.gap('8px'),
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  emailField: { maxWidth: '400px', flex: '1 1 240px' },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  error: { color: tokens.colorPaletteRedForeground1, fontSize: tokens.fontSizeBase200 },
  save: { alignSelf: 'flex-start' },
});

function D365RefreshAlertEmails({ emails, onChange, onSave, saving }) {
  const styles = useStyles();
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState('');
  const list = Array.isArray(emails) ? emails : [];

  const handleDraftChange = useCallback((event) => {
    setDraft(event.target.value);
    setLocalError('');
  }, []);

  const addFromDraft = useCallback(() => {
    const incoming = parseAlertEmails(draft);
    if (!incoming.length) {
      setLocalError('Enter an email address');
      return;
    }
    const invalid = incoming.filter((email) => !isValidAlertEmail(email));
    if (invalid.length) {
      setLocalError('One or more email addresses are invalid');
      return;
    }
    onChange(mergeAlertEmails(list, incoming));
    setDraft('');
    setLocalError('');
  }, [draft, list, onChange]);

  const handleDraftKeyDown = useCallback((event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addFromDraft();
  }, [addFromDraft]);

  const handleRemove = useCallback((email) => {
    onChange(list.filter((item) => item !== email));
  }, [list, onChange]);

  const handleSave = useCallback(() => {
    const incoming = parseAlertEmails(draft);
    if (!incoming.length) {
      onSave(list);
      return;
    }
    const invalid = incoming.filter((email) => !isValidAlertEmail(email));
    if (invalid.length) {
      setLocalError('One or more email addresses are invalid');
      return;
    }
    const next = mergeAlertEmails(list, incoming);
    onChange(next);
    setDraft('');
    setLocalError('');
    onSave(next);
  }, [draft, list, onChange, onSave]);

  return (
    <div className={styles.root}>
      <Text className={styles.hint}>
        These addresses receive the night error mail when a run fails, is interrupted, or an entity fails.
      </Text>
      {list.length ? (
        <div className={styles.chips}>
          {list.map((email) => (
            <D365RefreshAlertEmailChip key={email} email={email} onRemove={handleRemove} />
          ))}
        </div>
      ) : (
        <Text className={styles.hint}>No alert emails yet.</Text>
      )}
      <div className={styles.addRow}>
        <Field label="Add email" className={styles.emailField}>
          <Input
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleDraftKeyDown}
            placeholder="name@example.com"
            style={{ maxWidth: '400px' }}
          />
        </Field>
        <Button appearance="secondary" onClick={addFromDraft}>Add</Button>
      </div>
      {localError ? <Text className={styles.error}>{localError}</Text> : null}
      <Button
        appearance="primary"
        size="small"
        className={styles.save}
        icon={<Save24Regular />}
        onClick={handleSave}
        disabled={saving}
      >
        Save
      </Button>
    </div>
  );
}

export default memo(D365RefreshAlertEmails);
