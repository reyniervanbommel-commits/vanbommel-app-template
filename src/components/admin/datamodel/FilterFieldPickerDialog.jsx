import React, { memo, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Option,
  SearchBox,
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
  search: {
    width: '100%',
    marginBottom: '8px',
  },
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
  hint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginBottom: '8px',
  },
  fieldLabel: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    flexWrap: 'wrap',
  },
});

export const OPERATOR_LABELS = {
  eq: 'equals',
  ne: 'does not equal',
  lt: 'before',
  gt: 'after',
  contains: 'contains',
  notcontains: 'does not contain',
  startswith: 'starts with',
  notstartswith: 'does not start with',
  oneof: 'is one of',
};

function operatorsForType(valueType) {
  if (valueType === 'text') return ['eq', 'ne', 'contains', 'notcontains', 'startswith', 'notstartswith', 'oneof'];
  if (valueType === 'enum') return ['eq', 'ne', 'oneof'];
  if (valueType === 'date') return ['eq', 'ne', 'lt', 'gt'];
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
  const [searchTerm, setSearchTerm] = useState('');

  const levelTitle = level === 'line' ? 'Subitems (Lines)' : 'Main items (Headers)';
  const sortedFields = useMemo(
    () => [...fields].sort((a, b) => {
      const recommendedDelta = Number(Boolean(b.recommended)) - Number(Boolean(a.recommended));
      if (recommendedDelta) return recommendedDelta;
      return (b.nonEmptyCount || 0) - (a.nonEmptyCount || 0);
    }),
    [fields]
  );

  const filteredFields = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return sortedFields;
    return sortedFields.filter((field) =>
      `${field.label || ''} ${field.field || ''}`.toLowerCase().includes(term)
    );
  }, [sortedFields, searchTerm]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Select field from {levelTitle}</DialogTitle>
          <DialogContent>
            <Text className={styles.hint} block>
              Prefer a group field such as Vendor group or Purchase order status. That keeps the D365
              filter short. Long lists of vendor accounts are slower.
            </Text>
            <SearchBox
              className={styles.search}
              placeholder="Search field by name..."
              value={searchTerm}
              onChange={(_, data) => setSearchTerm(data.value)}
            />
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
                  {filteredFields.map((field) => {
                    const ops = operatorsForType(field.valueType);
                    const selectedOperator = operatorByField[field.field] || ops[0];
                    return (
                      <TableRow key={`${field.level}-${field.field}`}>
                        <TableCell>
                          <div className={styles.fieldLabel}>
                            <Text weight="semibold">{field.label}</Text>
                            {field.resolveVia === 'vendor-group' || /group|pool|buyer/i.test(String(field.field || '')) ? (
                              <Badge appearance="tint" color="brand" size="small">Group</Badge>
                            ) : field.recommended ? (
                              <Badge appearance="tint" color="informative" size="small">Compact</Badge>
                            ) : null}
                          </div>
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
                  {!filteredFields.length ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Text className={styles.emptyState}>
                          {searchTerm.trim()
                            ? `No fields match "${searchTerm.trim()}".`
                            : `No filterable fields with sampled values for ${levelTitle}. Run Sync now or switch level.`}
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

