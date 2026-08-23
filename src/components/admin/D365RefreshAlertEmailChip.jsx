import React, { memo, useCallback } from 'react';
import { Badge, Button, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { Dismiss16Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('2px'),
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding('2px', '4px', '2px', '8px'),
  },
  dismiss: {
    minWidth: '24px',
    maxWidth: '24px',
    height: '24px',
    ...shorthands.padding('0'),
  },
});

function D365RefreshAlertEmailChip({ email, onRemove }) {
  const styles = useStyles();
  const handleRemove = useCallback(() => {
    onRemove(email);
  }, [email, onRemove]);

  return (
    <span className={styles.chip}>
      <Badge appearance="ghost" color="brand">{email}</Badge>
      <Button
        appearance="transparent"
        size="small"
        className={styles.dismiss}
        icon={<Dismiss16Regular />}
        aria-label={`Remove ${email}`}
        title={`Remove ${email}`}
        onClick={handleRemove}
      />
    </span>
  );
}

export default memo(D365RefreshAlertEmailChip);
