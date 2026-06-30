import React, { useCallback, useMemo, useState } from 'react';
import { Button, Checkbox, makeStyles, tokens } from '@fluentui/react-components';
import useDevFeatureChecklist from '../../hooks/useDevFeatureChecklist';

const useStyles = makeStyles({
  root: {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    width: '320px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.colorNeutralStroke2,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
    zIndex: 9998,
  },
  compactHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
  },
  title: {
    margin: 0,
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
    fontWeight: 600,
  },
  subtitle: {
    marginTop: '2px',
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
  body: {
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: tokens.colorNeutralStroke2,
    padding: '10px',
    display: 'grid',
    gap: '8px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default function DevFeatureChecklist() {
  const styles = useStyles();
  const [isOpen, setIsOpen] = useState(true);
  const { items, checkedIds, completedCount, totalCount, allCompleted, toggleChecked, resetChecked } =
    useDevFeatureChecklist();

  const checkedIdSet = useMemo(() => new Set(checkedIds), [checkedIds]);
  const openItems = useMemo(
    () => items.filter((item) => !checkedIdSet.has(item.id)),
    [items, checkedIdSet],
  );

  const handleToggleOpen = useCallback(() => {
    setIsOpen((current) => !current);
  }, []);

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

  return (
    <aside className={styles.root}>
      <div className={styles.compactHeader}>
        <div>
          <p className={styles.title}>Nieuwe features (DEV)</p>
          <div className={styles.subtitle}>
            {completedCount}/{totalCount} afgerond
          </div>
        </div>
        <Button appearance="subtle" size="small" onClick={handleToggleOpen}>
          {isOpen ? 'Verberg' : 'Toon'}
        </Button>
      </div>

      {isOpen ? (
        <div className={styles.body}>
          {openItems.map((item) => (
            <Checkbox
              key={item.id}
              data-feature-id={item.id}
              checked={checkedIdSet.has(item.id)}
              onChange={handleCheckboxChange}
              label={item.label}
            />
          ))}

          <div className={styles.actions}>
            <span className={styles.subtitle}>{allCompleted ? 'Alles afgevinkt' : 'Nog open punten'}</span>
            <Button appearance="subtle" size="small" onClick={resetChecked}>
              Reset
            </Button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
