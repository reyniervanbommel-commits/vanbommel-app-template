import React from 'react';
import { Button, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { FORMULA_FUNCTIONS_HELP } from './purchaseOrderFormulaFunctions';

const useStyles = makeStyles({
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  pickerWrap: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  chipList: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('6px'),
    maxHeight: '168px',
    overflowY: 'auto',
    ...shorthands.padding('4px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusMedium,
  },
});

// Puur presentationeel: toont twee klikbare lijsten (kolommen + functies) die
// tekst in de formule-textarea invoegen. Geen berekeningslogica hier — die
// staat uitsluitend server-side in tableFormulaEngine.js.
export default function PurchaseOrderFormulaHelpPanel({ referenceColumns, onInsertReference, onInsertFunction }) {
  const styles = useStyles();

  return (
    <div className={styles.wrap}>
      <div className={styles.pickerWrap}>
        <Text weight="semibold">Column references</Text>
        <div className={styles.chipList}>
          {referenceColumns.map((column) => (
            <Button
              key={column.key}
              size="small"
              appearance="secondary"
              onClick={() => onInsertReference(column.key)}
            >
              {column.label}
            </Button>
          ))}
        </div>
      </div>

      <div className={styles.pickerWrap}>
        <Text weight="semibold">Functions</Text>
        <div className={styles.chipList}>
          {FORMULA_FUNCTIONS_HELP.map((fn) => (
            <Button
              key={fn.name}
              size="small"
              appearance="secondary"
              title={fn.description}
              onClick={() => onInsertFunction(fn.snippet)}
            >
              {fn.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
