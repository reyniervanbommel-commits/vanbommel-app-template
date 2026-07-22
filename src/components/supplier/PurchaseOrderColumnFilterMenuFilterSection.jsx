import React, { useCallback, useState } from 'react';
import { Button, Input, Text } from '@fluentui/react-components';
import { ChevronDownRegular } from '@fluentui/react-icons';
import PurchaseOrderColumnFilterMenuButton from './PurchaseOrderColumnFilterMenuButton';

export default function PurchaseOrderColumnFilterMenuFilterSection({
  styles,
  columnLabel,
  closeSubmenu,
  isDate,
  isNumber,
  draft,
  operatorLabels,
  operatorEntries,
  handleOperatorSelect,
  handleValueChange,
  handleSecondaryValueChange,
  handleApplyFilter,
  handleClearFilter,
  onMouseEnter,
}) {
  const [operatorFlyoutOpen, setOperatorFlyoutOpen] = useState(false);

  const handleFilterRowMouseEnter = useCallback(() => {
    setOperatorFlyoutOpen(false);
    onMouseEnter?.();
  }, [onMouseEnter]);

  const handleOperatorToggle = useCallback(() => {
    setOperatorFlyoutOpen((prev) => !prev);
  }, []);

  const handleOperatorPick = useCallback((operatorKey) => {
    handleOperatorSelect(null, { optionValue: operatorKey });
    setOperatorFlyoutOpen(false);
  }, [handleOperatorSelect]);

  const showSingleValue = !(
    (isDate && draft.operator === 'between')
    || (isNumber && draft.operator === 'between')
    || (isDate && draft.operator === 'nextWeek')
  );

  return (
    <div className={styles.filterBlock} onMouseEnter={handleFilterRowMouseEnter}>
      <Text className={styles.filterSectionLabel}>Filter</Text>
      <div className={styles.filterValueStack}>
        <div className={styles.filterOperatorWrap}>
          <Button
            className={styles.filterOperatorLink}
            appearance="transparent"
            size="small"
            aria-label={`Filter operator for ${columnLabel}`}
            aria-expanded={operatorFlyoutOpen}
            onClick={handleOperatorToggle}
          >
            <span className={styles.filterOperatorLinkContent}>
              {operatorLabels[draft.operator]}
              <ChevronDownRegular className={styles.filterOperatorChevron} aria-hidden="true" />
            </span>
          </Button>
          {operatorFlyoutOpen ? (
            <div className={styles.filterOperatorFlyout} role="listbox" aria-label="Filter operators">
              {operatorEntries.map(([key, label]) => (
                <Button
                  key={key}
                  className={styles.filterOperatorOption}
                  appearance="transparent"
                  size="small"
                  role="option"
                  aria-selected={draft.operator === key}
                  onClick={() => handleOperatorPick(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
        {showSingleValue && isDate && (draft.operator === 'before' || draft.operator === 'after') ? (
          <Input
            className={styles.filterValueField}
            type="date"
            size="small"
            value={draft.value}
            onChange={handleValueChange}
            aria-label={`Filter value for ${columnLabel}`}
          />
        ) : null}
        {showSingleValue && isDate && (draft.operator === 'inNextWeeks' || draft.operator === 'inNextDays') ? (
          <Input
            className={styles.filterValueField}
            type="number"
            size="small"
            min={1}
            value={draft.value}
            onChange={handleValueChange}
            placeholder="Amount"
            aria-label={`Filter amount for ${columnLabel}`}
          />
        ) : null}
        {showSingleValue && isNumber && draft.operator !== 'between' ? (
          <Input
            className={styles.filterValueField}
            type="number"
            size="small"
            value={draft.value}
            onChange={handleValueChange}
            placeholder="Value"
            aria-label={`Filter value for ${columnLabel}`}
          />
        ) : null}
        {showSingleValue && !isDate && !isNumber ? (
          <Input
            className={styles.filterValueField}
            size="small"
            value={draft.value}
            onChange={handleValueChange}
            placeholder={draft.operator === 'oneOf' ? 'Value1, Value2' : 'Value'}
            aria-label={`Filter value for ${columnLabel}`}
          />
        ) : null}
      </div>
      {isDate && draft.operator === 'between' ? (
        <div className={styles.filterBetweenRow}>
          <Input
            className={styles.filterValueFieldBetween}
            type="date"
            size="small"
            value={draft.value}
            onChange={handleValueChange}
            aria-label={`Filter from date for ${columnLabel}`}
          />
          <Input
            className={styles.filterValueFieldBetween}
            type="date"
            size="small"
            value={draft.secondaryValue}
            onChange={handleSecondaryValueChange}
            aria-label={`Filter to date for ${columnLabel}`}
          />
        </div>
      ) : null}
      {isNumber && draft.operator === 'between' ? (
        <div className={styles.filterBetweenRow}>
          <Input
            className={styles.filterValueFieldBetween}
            type="number"
            size="small"
            value={draft.value}
            onChange={handleValueChange}
            placeholder="From"
            aria-label={`Filter from value for ${columnLabel}`}
          />
          <Input
            className={styles.filterValueFieldBetween}
            type="number"
            size="small"
            value={draft.secondaryValue}
            onChange={handleSecondaryValueChange}
            placeholder="To"
            aria-label={`Filter to value for ${columnLabel}`}
          />
        </div>
      ) : null}
      {isDate && draft.operator === 'nextWeek' ? (
        <Text className={styles.filterHint}>Matches records in the next calendar week.</Text>
      ) : null}
      <div className={styles.filterActionRow}>
        <PurchaseOrderColumnFilterMenuButton
          className={styles.filterApplyButton}
          size="extra-small"
          appearance="primary"
          closeSubmenu={closeSubmenu}
          onClick={handleApplyFilter}
        >
          Apply
        </PurchaseOrderColumnFilterMenuButton>
        <PurchaseOrderColumnFilterMenuButton
          className={styles.filterClearButton}
          size="extra-small"
          appearance="outline"
          closeSubmenu={closeSubmenu}
          onClick={handleClearFilter}
        >
          Clear
        </PurchaseOrderColumnFilterMenuButton>
      </div>
    </div>
  );
}
