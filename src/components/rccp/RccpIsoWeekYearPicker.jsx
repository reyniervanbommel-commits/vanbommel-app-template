import React, { memo, useCallback } from 'react';
import { Button, mergeClasses } from '@fluentui/react-components';

/** Year grid used by RccpIsoWeekRangePicker when picking a year to jump to. */
function RccpIsoWeekYearPicker({ years, viewYear, onSelectYear, gridClassName, buttonClassName }) {
  const handleClick = useCallback((year) => {
    onSelectYear(year);
  }, [onSelectYear]);

  return (
    <div className={gridClassName}>
      {(years || []).map((year) => (
        <Button
          key={year}
          size="small"
          appearance={year === viewYear ? 'primary' : 'outline'}
          className={mergeClasses(buttonClassName)}
          onClick={() => handleClick(year)}
        >
          {year}
        </Button>
      ))}
    </div>
  );
}

export default memo(RccpIsoWeekYearPicker);
