import React, { memo, useCallback, useState } from 'react';
import { Button } from '@fluentui/react-components';

function RemarkComposer({ currentUser, column = null, onSubmit }) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const normalizedLength = draft.normalize('NFC').trim().length;
  const invalid = normalizedLength < 1 || normalizedLength > 2000;

  const handleChange = useCallback((event) => {
    setDraft(event.target.value);
    setSubmitError('');
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (invalid || submitting) return;
      setSubmitting(true);
      setSubmitError('');
      try {
        await onSubmit(draft, column?.id || null);
        setDraft('');
      } catch (error) {
        setSubmitError(error?.message || 'Failed to save remark');
      } finally {
        setSubmitting(false);
      }
    },
    [column?.id, draft, invalid, onSubmit, submitting]
  );

  return (
    <form className="remarks-composer" onSubmit={handleSubmit}>
      <label htmlFor="row-remark-composer">
        Add a remark as <strong>{currentUser?.displayName || 'Current user'}</strong>
        {column?.label ? <span className="remarks-muted"> · {column.label}</span> : null}
      </label>
      <textarea
        id="row-remark-composer"
        value={draft}
        maxLength={2000}
        disabled={submitting}
        aria-describedby="row-remark-counter row-remark-error"
        onChange={handleChange}
      />
      <div className="remarks-composer-actions">
        <span id="row-remark-counter" className="remarks-muted">
          {normalizedLength}/2000
        </span>
        <Button appearance="primary" type="submit" disabled={invalid || submitting}>
          {submitting ? 'Saving…' : 'Add remark'}
        </Button>
      </div>
      {submitError ? (
        <div id="row-remark-error" className="remarks-error" role="alert">
          {submitError}
        </div>
      ) : null}
    </form>
  );
}

export default memo(RemarkComposer);
