import React, { memo, useCallback, useState } from 'react';
import { Button, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { ChevronDownRegular, ChevronRightRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('12px', '20px', '20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
  toggle: {
    justifyContent: 'flex-start',
    minHeight: '32px',
    ...shorthands.padding('0'),
    fontWeight: tokens.fontWeightSemibold,
  },
});

function D365RefreshFold({ title, defaultOpen = true, children }) {
  const styles = useStyles();
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const handleToggle = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  return (
    <div className={styles.section}>
      <Button
        appearance="transparent"
        className={styles.toggle}
        icon={open ? <ChevronDownRegular /> : <ChevronRightRegular />}
        aria-expanded={open}
        onClick={handleToggle}
      >
        {title}
      </Button>
      {open ? children : null}
    </div>
  );
}

export default memo(D365RefreshFold);
