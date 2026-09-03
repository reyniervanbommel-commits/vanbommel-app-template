import React, { memo, useCallback, useState } from 'react';
import { Button, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { ChevronDownRegular, ChevronRightRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('16px', '20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    width: '100%',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    flexWrap: 'wrap',
  },
  toggle: {
    minWidth: 'auto',
    justifyContent: 'flex-start',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    width: '100%',
  },
});

/**
 * Datamodel-sectie; optioneel inklapbaar zonder Fluent Accordion.
 */
function DataModelCollapsibleSection({
  title,
  titleExtra = null,
  defaultOpen = true,
  collapsible = true,
  children,
}) {
  const styles = useStyles();
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const handleToggle = useCallback(() => {
    setOpen((current) => !current);
  }, []);
  const showBody = !collapsible || open;
  const Chevron = open ? ChevronDownRegular : ChevronRightRegular;

  return (
    <div className={styles.section}>
      <div className={styles.titleRow}>
        {collapsible ? (
          <Button
            appearance="subtle"
            className={styles.toggle}
            icon={<Chevron />}
            onClick={handleToggle}
            aria-expanded={open}
            aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
          >
            <Text weight="semibold">{title}</Text>
          </Button>
        ) : (
          <Text weight="semibold">{title}</Text>
        )}
        {titleExtra}
      </div>
      {showBody ? <div className={styles.body}>{children}</div> : null}
    </div>
  );
}

export default memo(DataModelCollapsibleSection);
