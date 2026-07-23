import React, { memo, useEffect, useRef } from 'react';
import { Button, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
import { layout } from '../../styles/brandTokens';

// Hoogte begrensd op de zichtbare viewport (header + main-padding eraf) zodat alléén de
// flyout-body scrollt en niet de hele pagina. 48px = boven+onder padding van <main>.
const PANEL_HEIGHT = `calc(100vh - ${layout.headerHeight + 48}px)`;

const useStyles = makeStyles({
  flyout: {
    width: '340px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    alignSelf: 'flex-start',
    height: PANEL_HEIGHT,
    maxHeight: PANEL_HEIGHT,
    position: 'sticky',
    top: '0',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderLeft('1px', 'solid', tokens.colorNeutralStroke2),
    overflow: 'hidden',
    ':focus-visible': {
      ...shorthands.outline('2px', 'solid', tokens.colorStrokeFocus2),
    },
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM, tokens.spacingVerticalMNudge),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    flexShrink: 0,
  },
  headerTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  nameWrap: { flex: 1, minWidth: 0, overflow: 'hidden' },
  actions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalSNudge),
    justifyContent: 'flex-end',
  },
  body: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    ...shorthands.padding('0', tokens.spacingHorizontalL, tokens.spacingVerticalL),
  },
});

function ChartBuilderFlyout({ title, onClose, actions, nameField, children }) {
  const styles = useStyles();
  const asideRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    asideRef.current?.focus();
    return () => {
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, []);

  return (
    <aside ref={asideRef} tabIndex={-1} className={styles.flyout} aria-label={title || 'Chart settings'}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.nameWrap}>{nameField}</div>
          <Button
            appearance="subtle"
            size="small"
            icon={<DismissRegular />}
            aria-label="Close chart settings"
            onClick={onClose}
          />
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      <div className={styles.body}>{children}</div>
    </aside>
  );
}

export default memo(ChartBuilderFlyout);
