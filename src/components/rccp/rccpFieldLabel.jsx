import React from 'react';
import {
  Label, Popover, PopoverTrigger, PopoverSurface, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { Info16Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  row: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXXS),
  },
  trigger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('0'),
    ...shorthands.border('0'),
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground3,
    cursor: 'help',
    verticalAlign: 'middle',
  },
  surface: {
    zIndex: 2000000,
    maxWidth: '260px',
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
  },
});

/**
 * Hover-uitleg die in een Drawer niet achter het overlay verdwijnt.
 * InfoLabel is klik-only; Fluent Tooltip vermijden in panels.
 */
export function RccpHoverHint({ info }) {
  const styles = useStyles();
  if (!info) return null;
  return (
    <Popover
      openOnHover
      withArrow
      trapFocus={false}
      unstable_disableAutoFocus
      size="small"
      mouseLeaveDelay={150}
      positioning={{ strategy: 'fixed', offset: 8, position: 'above' }}
    >
      <PopoverTrigger disableButtonEnhancement>
        <button type="button" className={styles.trigger} aria-label={info} tabIndex={0}>
          <Info16Regular />
        </button>
      </PopoverTrigger>
      <PopoverSurface className={styles.surface} style={{ zIndex: 2000000 }} role="tooltip">
        {info}
      </PopoverSurface>
    </Popover>
  );
}

function FieldLabelWithHint({ text, info, labelProps }) {
  const styles = useStyles();
  return (
    <Label {...labelProps}>
      <span className={styles.row}>
        {text}
        <RccpHoverHint info={info} />
      </span>
    </Label>
  );
}

/**
 * Field-label met optionele hover-uitleg.
 * @param {string} text
 * @param {string} [info]
 */
export function rccpFieldLabel(text, info) {
  if (!info) return text;
  return {
    children: (...args) => {
      const labelProps = args.length >= 2 ? args[1] : args[0];
      return <FieldLabelWithHint text={text} info={info} labelProps={labelProps} />;
    },
  };
}

/**
 * Switch- of sectielabel met hover-uitleg.
 * @param {{ info: string, children: import('react').ReactNode }} props
 */
export function RccpInfoLabel({ info, children }) {
  const styles = useStyles();
  return (
    <span className={styles.row}>
      {children}
      <RccpHoverHint info={info} />
    </span>
  );
}
