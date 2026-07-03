import React, { memo, useMemo, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Option,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  tableWrap: {
    maxHeight: '340px',
    overflowY: 'auto',
    overflowX: 'auto',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius('6px'),
  },
  samples: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  opCell: { minWidth: '210px' },
  fieldCell: { minWidth: '220px' },
  emptyState: {
    color: tokens.colorNeutralForeground3,
    ...shorthands.padding('8px', '12px'),
  },
});

export const OPERATOR_LABELS = {
  eq: 'equals',
  ne: 'does not equal',
  contains: 'contains',
  notcontains: 'does not contain',
  startswith: 'starts with',
  notstartswith: 'does not start with',
  oneof: 'is one of',
};

function operatorsForType(valueType) {
  if (valueType === 'text') return ['eq', 'ne', 'contains', 'notcontains', 'startswith', 'notstartswith', 'oneof'];
  if (valueType === 'enum') return ['eq', 'ne', 'oneof'];
  return ['eq', 'ne', 'oneof'];
}

/**
 * Popup met tabelstructuur voor veldkeuze:
 * - kolom 1: veldnaam
 * - kolom 2: voorbeeldwaardes
 * - kolom 3: operator-keuze
 */
function FilterFieldPickerDialog({ open, level, fields, onClose, onSelect }) {
  const styles = useStyles();
  const [operatorByField, setOperatorByField] = useState({});

  const levelTitle = level === 'line' ? 'Subitems (Lines)' : 'Main items (Headers)';
  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => (b.nonEmptyCount || 0) - (a.nonEmptyCount || 0)),
    [fields]
  );

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Select field from {levelTitle}</DialogTitle>
          <DialogContent>
            <div className={styles.tableWrap}>
              <Table size="small">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell className={styles.fieldCell}>Field</TableHeaderCell>
                    <TableHeaderCell>Sample values</TableHeaderCell>
                    <TableHeaderCell className={styles.opCell}>Operator</TableHeaderCell>
                    <TableHeaderCell>Action</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFields.map((field) => {
                    const ops = operatorsForType(field.valueType);
                    const selectedOperator = operatorByField[field.field] || ops[0];
                    return (
                      <TableRow key={`${field.level}-${field.field}`}>
                        <TableCell>
                          <Text weight="semibold">{field.label}</Text>
                          <Text className={styles.samples} block>{field.field}</Text>
                        </TableCell>
                        <TableCell>
                          <Text className={styles.samples}>
                            {field.sampleValues?.length ? field.sampleValues.join(' | ') : '—'}
                          </Text>
                        </TableCell>
                        <TableCell>
                          <Dropdown
                            value={OPERATOR_LABELS[selectedOperator]}
                            selectedOptions={[selectedOperator]}
                            onOptionSelect={(_, data) => {
                              setOperatorByField((prev) => ({ ...prev, [field.field]: data.optionValue }));
                            }}
                          >
                            {ops.map((op) => (
                              <Option key={op} value={op} text={OPERATOR_LABELS[op]}>
                                {OPERATOR_LABELS[op]}
                              </Option>
                            ))}
                          </Dropdown>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            appearance="primary"
                            onClick={() => onSelect(field, selectedOperator)}
                          >
                            Use field
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!sortedFields.length ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Text className={styles.emptyState}>
                          No filterable fields with sampled values for {levelTitle}. Run Sync now or switch level.
                        </Text>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>Close</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

export default memo(FilterFieldPickerDialog);

