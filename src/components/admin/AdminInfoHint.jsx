import React, { memo } from 'react';
import {
  Button,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { Info16Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  trigger: {
    minWidth: '24px',
    maxWidth: '24px',
    height: '24px',
    ...shorthands.padding('0'),
  },
  surface: {
    maxWidth: '320px',
    ...shorthands.padding('12px'),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  text: {
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
  },
});

/**
 * Klikbare (i) met korte toelichting. Geen Fluent Tooltip: die veroorzaakt in
 * admin-panels een wit vlak. Alleen op sectiekoppen/acties, nooit in tabellenrijen.
 */
function AdminInfoHint({ text, label = 'More information' }) {
  const styles = useStyles();
  if (!text) return null;
  return (
    <Popover withArrow size="small" positioning="after">
      <PopoverTrigger disableButtonEnhancement>
        <Button
          appearance="transparent"
          size="small"
          className={styles.trigger}
          icon={<Info16Regular />}
          aria-label={label}
        />
      </PopoverTrigger>
      <PopoverSurface className={styles.surface}>
        <Text className={styles.text}>{text}</Text>
      </PopoverSurface>
    </Popover>
  );
}

export default memo(AdminInfoHint);
