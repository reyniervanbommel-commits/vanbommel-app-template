import React, { useCallback } from 'react';
import { Button, makeStyles, shorthands, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  sortActions: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
  },
  sortButton: {
    justifyContent: 'flex-start',
  },
  submenuButton: {
    justifyContent: 'space-between',
  },
  submenuButtonActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  divider: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
});

// Actieknoppen van het kolommenmenu (sorteren, groeperen-toggle, sync-writeback,
// kolom toevoegen/verwijderen, regel-totaal en push-acties). 1:1 verplaatst uit
// PurchaseOrderColumnFilterMenu; gedrag en volgorde blijven identiek. De component
// bouwt zijn eigen click-handlers en sluit de popover via onClose.
function PurchaseOrderColumnMenuActions({
  column,
  isAdmin,
  activeSubmenu,
  onToggleSubmenu,
  onClose,
  canAddColumn,
  isLineColumnSummed = false,
  onSetSortDirection,
  onToggleWriteback,
  onRemoveColumn,
  onToggleLineColumnSum,
  onPushLineTotalToHeader,
  onPushLineValuesToHeader,
}) {
  const styles = useStyles();
  // Image-kolommen hebben geen opgeslagen waarde en zijn afgeleid: sorteren, filteren
  // én groeperen zijn zinloos en worden voor dit type verborgen.
  const isImageColumn = column.dataType === 'image';
  const writable = !!column.writableToD365;
  const canToggleWriteback = Boolean(isAdmin && typeof onToggleWriteback === 'function' && column.d365Field && column.writeBackAllowed !== false);
  const canRemoveColumn = Boolean(column.source === 'custom' && typeof onRemoveColumn === 'function');
  const isLineColumn = column.level === 'line';
  const isLineNumberColumn = column.level === 'line' && column.dataType === 'number';
  const canToggleLineTotal = Boolean(isLineNumberColumn && typeof onToggleLineColumnSum === 'function');
  const canPushLineTotalToHeader = Boolean(isLineNumberColumn && typeof onPushLineTotalToHeader === 'function');
  const canPushLineValuesToHeader = Boolean(isLineColumn && typeof onPushLineValuesToHeader === 'function');

  const setSortAsc = useCallback(() => {
    onSetSortDirection(column.key, 'asc');
    onClose();
  }, [column.key, onSetSortDirection, onClose]);
  const setSortDesc = useCallback(() => {
    onSetSortDirection(column.key, 'desc');
    onClose();
  }, [column.key, onSetSortDirection, onClose]);
  const clearSort = useCallback(() => {
    onSetSortDirection('', 'none');
    onClose();
  }, [onSetSortDirection, onClose]);

  const handleRemoveColumn = useCallback(async () => {
    if (!canRemoveColumn) return;
    const shouldDelete = window.confirm(
      `Delete column "${column.label}"? This permanently removes the column and all related values from SQL.`
    );
    if (!shouldDelete) return;
    try {
      await onRemoveColumn(column.id);
      onClose();
    } catch (err) {
      window.alert(err?.message || 'Deleting the column failed.');
    }
  }, [canRemoveColumn, column.id, column.label, onRemoveColumn, onClose]);

  const handleToggleWriteback = useCallback(() => {
    if (!canToggleWriteback) return;
    onToggleWriteback(column.id, !writable);
    onClose();
  }, [canToggleWriteback, column.id, onToggleWriteback, writable, onClose]);
  const handleToggleLineTotal = useCallback(() => {
    if (!canToggleLineTotal) return;
    onToggleLineColumnSum(column.key, !isLineColumnSummed);
    onClose();
  }, [canToggleLineTotal, column.key, isLineColumnSummed, onToggleLineColumnSum, onClose]);
  const handlePushLineTotalToHeader = useCallback(() => {
    if (!canPushLineTotalToHeader) return;
    onPushLineTotalToHeader(column);
    onClose();
  }, [canPushLineTotalToHeader, column, onPushLineTotalToHeader, onClose]);
  const handlePushLineValuesToHeader = useCallback(() => {
    if (!canPushLineValuesToHeader) return;
    onPushLineValuesToHeader(column);
    onClose();
  }, [canPushLineValuesToHeader, column, onPushLineValuesToHeader, onClose]);

  return (
    <>
      {isImageColumn ? null : (
        <>
          <div className={styles.sortActions}>
            <Button className={styles.sortButton} appearance="subtle" size="small" onClick={setSortAsc}>
              Sort A to Z
            </Button>
            <Button className={styles.sortButton} appearance="subtle" size="small" onClick={setSortDesc}>
              Sort Z to A
            </Button>
            <Button className={styles.sortButton} appearance="subtle" size="small" onClick={clearSort}>
              Clear sort
            </Button>
          </div>
          <div className={styles.divider} />
        </>
      )}
      {isImageColumn ? null : (
        <Button
          className={`${styles.sortButton} ${styles.submenuButton} ${activeSubmenu === 'group' ? styles.submenuButtonActive : ''}`}
          appearance="subtle"
          size="small"
          onClick={() => onToggleSubmenu('group')}
        >
          <span>Categorie / groeperen</span>
          <span aria-hidden>›</span>
        </Button>
      )}
      {canToggleWriteback ? (
        <>
          <div className={styles.divider} />
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleToggleWriteback}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <img src="/d365-sync-cloud.png" alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
              {writable ? 'Sync uitzetten' : 'Sync aanzetten'}
            </span>
          </Button>
        </>
      ) : null}
      {canAddColumn ? (
        <>
          <div className={styles.divider} />
          <Button
            className={`${styles.sortButton} ${styles.submenuButton} ${activeSubmenu === 'add' ? styles.submenuButtonActive : ''}`}
            appearance="subtle"
            size="small"
            onClick={() => onToggleSubmenu('add')}
          >
            <span>+ Kolom rechts toevoegen</span>
            <span aria-hidden>›</span>
          </Button>
        </>
      ) : null}
      {canRemoveColumn ? (
        <>
          <div className={styles.divider} />
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleRemoveColumn}>
            Delete column
          </Button>
        </>
      ) : null}
      {canToggleLineTotal ? (
        <>
          <div className={styles.divider} />
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handleToggleLineTotal}>
            {isLineColumnSummed ? 'Disable total row sum' : 'Enable total row sum'}
          </Button>
        </>
      ) : null}
      {canPushLineTotalToHeader ? (
        <>
          <div className={styles.divider} />
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handlePushLineTotalToHeader}>
            Push total to header column
          </Button>
        </>
      ) : null}
      {canPushLineValuesToHeader ? (
        <>
          <div className={styles.divider} />
          <Button className={styles.sortButton} appearance="subtle" size="small" onClick={handlePushLineValuesToHeader}>
            Push values to header column
          </Button>
        </>
      ) : null}
    </>
  );
}

export default PurchaseOrderColumnMenuActions;
