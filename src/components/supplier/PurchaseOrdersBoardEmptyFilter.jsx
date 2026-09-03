import { Button } from '@fluentui/react-components';

export default function PurchaseOrdersBoardEmptyFilter({
  visible,
  activeFilterCount = 0,
  onClearAllFilters,
  overlayClassName,
  contentClassName,
}) {
  if (!visible) return null;
  return (
    <div className={overlayClassName}>
      <div className={contentClassName}>
        <span>No rows match the active filters</span>
        {activeFilterCount > 0 ? (
          <Button appearance="subtle" onClick={onClearAllFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
