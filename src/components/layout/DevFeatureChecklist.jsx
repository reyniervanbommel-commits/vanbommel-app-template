import React, { useCallback, useMemo, useState } from 'react';
import { Button, Checkbox, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { BeakerRegular, Dismiss24Regular } from '@fluentui/react-icons';
import { APP_VERSION } from '../../config/version';
import useDevFeatureChecklist from '../../hooks/useDevFeatureChecklist';

const useStyles = makeStyles({
  badge: {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    zIndex: 9998,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    ...shorthands.padding('5px', '10px'),
    ...shorthands.borderRadius('20px'),
    ...shorthands.border('1px', 'solid', '#ff4444'),
    backgroundColor: tokens.colorNeutralBackground3,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background-color 0.15s',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3Hover,
    },
  },
  badgeIcon: {
    fontSize: '13px',
    color: tokens.colorNeutralForeground3,
  },
  badgeText: {
    fontSize: '11px',
    color: '#ff4444',
    fontWeight: 700,
  },
  panel: {
    position: 'fixed',
    bottom: '52px',
    right: '16px',
    width: '340px',
    maxHeight: '70vh',
    zIndex: 9999,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    ...shorthands.borderRadius('12px'),
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: tokens.shadow16,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.padding('14px', '16px', '10px'),
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  panelTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
  },
  panelBody: {
    overflowY: 'auto',
    ...shorthands.padding('8px', '0'),
    flex: 1,
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    ...shorthands.padding('4px', '16px'),
    ':hover': { backgroundColor: tokens.colorNeutralBackground2 },
  },
  itemLabel: {
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
    lineHeight: '20px',
    flex: 1,
  },
  itemDone: {
    textDecoration: 'line-through',
    color: tokens.colorNeutralForeground3,
  },
  groupTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: tokens.colorNeutralForeground2,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    ...shorthands.padding('10px', '16px', '4px'),
  },
  panelFooter: {
    ...shorthands.padding('10px', '16px'),
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: '11px',
    color: tokens.colorNeutralForeground3,
  },
  emptyState: {
    fontSize: '13px',
    color: tokens.colorNeutralForeground3,
    ...shorthands.padding('16px'),
  },
});

export default function DevFeatureChecklist() {
  const styles = useStyles();
  const [isOpen, setIsOpen] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const { items, checkedIds, completedCount, totalCount, allCompleted, toggleChecked, resetChecked } =
    useDevFeatureChecklist();
  const versionLabel = APP_VERSION || 'v0.0.0';

  const checkedIdSet = useMemo(() => new Set(checkedIds), [checkedIds]);
  const visibleItems = useMemo(
    () => (showCompleted ? items : items.filter((item) => !checkedIdSet.has(item.id))),
    [checkedIdSet, items, showCompleted],
  );

  const handleToggleOpen = useCallback(() => {
    setIsOpen((current) => !current);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleToggleShowCompleted = useCallback(
    (_event, data) => {
      setShowCompleted(Boolean(data.checked));
    },
    [],
  );

  const handleCheckboxChange = useCallback(
    (event) => {
      const featureId = event.currentTarget.getAttribute('data-feature-id');
      if (!featureId) {
        return;
      }

      toggleChecked(featureId);
    },
    [toggleChecked],
  );

  const progressLabel = totalCount > 0 ? `${completedCount}/${totalCount}` : '0/0';

  return (
    <>
      <div className={styles.badge} onClick={handleToggleOpen} title="Open DEV checklist">
        <BeakerRegular className={styles.badgeIcon} />
        <Text className={styles.badgeText}>
          DEV {versionLabel} - {progressLabel}
        </Text>
      </div>

      {isOpen ? (
        <aside className={styles.panel}>
          <div className={styles.panelHeader}>
            <Text className={styles.panelTitle}>DEV checklist</Text>
            <Button
              appearance="transparent"
              size="small"
              icon={<Dismiss24Regular />}
              onClick={handleClose}
              aria-label="Close DEV checklist"
            />
          </div>

          <div className={styles.panelBody}>
            {items.length === 0 ? (
              <Text className={styles.emptyState}>No test items configured for this build.</Text>
            ) : visibleItems.length === 0 ? (
              <Text className={styles.emptyState}>
                All open test items are completed. Enable &quot;Show completed&quot; to review them.
              </Text>
            ) : (
              visibleItems.map((item, index) => {
                const previousTitle = index > 0 ? visibleItems[index - 1]?.title : null;
                const showTitle = item.title && item.title !== previousTitle;
                return (
                  <React.Fragment key={item.id}>
                    {showTitle ? <Text className={styles.groupTitle}>{item.title}</Text> : null}
                    <div className={styles.item}>
                      <Checkbox
                        data-feature-id={item.id}
                        checked={checkedIdSet.has(item.id)}
                        onChange={handleCheckboxChange}
                      />
                      <Text
                        className={`${styles.itemLabel}${checkedIdSet.has(item.id) ? ` ${styles.itemDone}` : ''}`}
                      >
                        {item.label}
                      </Text>
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>

          <div className={styles.panelFooter}>
            <Checkbox
              label="Show completed"
              checked={showCompleted}
              onChange={handleToggleShowCompleted}
            />
            <div>
              <Text className={styles.progressText}>
                {allCompleted && totalCount > 0 ? 'All test items completed' : `${progressLabel} completed`}
              </Text>
              {completedCount > 0 ? (
                <Button appearance="subtle" size="small" onClick={resetChecked}>
                  Reset
                </Button>
              ) : null}
            </div>
          </div>
        </aside>
      ) : null}
    </>
  );
}
