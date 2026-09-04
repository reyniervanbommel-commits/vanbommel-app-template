import React, { memo, useCallback, useMemo, useState } from 'react';
import { Badge, Input, Spinner, Switch, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import AdminInfoHint from './AdminInfoHint';
import DataModelCollapsibleSection from './DataModelCollapsibleSection';
import { DATA_MODEL_INFO } from './dataModelInfoCopy';
import { matchesText, sortFlaggedFirst } from './entityConfigTableUtils';

const useStyles = makeStyles({
  list: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    maxHeight: '420px',
    overflowY: 'auto',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('12px'),
  },
  name: {
    minWidth: 0,
    overflowWrap: 'anywhere',
    color: tokens.colorNeutralForeground1,
  },
  hint: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  error: { color: tokens.colorPaletteRedForeground1 },
  empty: { color: tokens.colorNeutralForeground3 },
  filterInput: { maxWidth: '420px' },
});

function PavBoardColumnRow({ name, visible, disabled, onSetVisible }) {
  const styles = useStyles();
  const handleChange = useCallback((_, data) => {
    onSetVisible(name, Boolean(data.checked));
  }, [name, onSetVisible]);
  return (
    <div className={styles.row}>
      <Text className={styles.name} title={name}>{name}</Text>
      <Switch
        label="Visible on PO board"
        checked={Boolean(visible)}
        disabled={disabled}
        onChange={handleChange}
      />
    </div>
  );
}

/**
 * Admin-panel: kies welke attribuutnamen als PO-boardkolommen verschijnen.
 */
function ProductAttributeBoardColumnsPanel({
  names,
  loading,
  error,
  togglingName,
  onSetVisible,
}) {
  const styles = useStyles();
  const [nameFilter, setNameFilter] = useState('');
  const handleNameFilter = useCallback((_, data) => setNameFilter(data.value), []);
  const visibleCount = (names || []).filter((entry) => entry.visible).length;
  const sortedNames = useMemo(() => {
    const matched = (names || []).filter((entry) => matchesText(entry.name, nameFilter));
    return sortFlaggedFirst(matched, (entry) => entry.visible);
  }, [names, nameFilter]);
  const titleExtra = (
    <>
      <Badge appearance="tint" color="brand" size="small">
        {visibleCount} visible · {(names || []).length} attributes
      </Badge>
      <AdminInfoHint text={DATA_MODEL_INFO.pavBoardColumns} label="About PO board columns" />
    </>
  );
  return (
    <DataModelCollapsibleSection title="PO board columns" titleExtra={titleExtra}>
      <Text className={styles.hint} block>
        Board cells use Text value when Attribute value is empty. Product number matches Items ItemNumber and the PO line ItemNumber.
      </Text>
      <Input
        className={styles.filterInput}
        value={nameFilter}
        onChange={handleNameFilter}
        placeholder="Filter attribute names"
      />
      {loading ? <Spinner label="Loading attribute names..." /> : null}
      {error ? <Text className={styles.error} block>{error}</Text> : null}
      {!loading && !sortedNames.length ? (
        <Text className={styles.empty} block>
          {names.length ? 'No attribute names match the active filter' : 'No attribute names yet. Sync this entity first.'}
        </Text>
      ) : (
        <div className={styles.list}>
          {sortedNames.map((entry) => (
            <PavBoardColumnRow
              key={entry.name}
              name={entry.name}
              visible={entry.visible}
              disabled={togglingName === entry.name}
              onSetVisible={onSetVisible}
            />
          ))}
        </div>
      )}
    </DataModelCollapsibleSection>
  );
}

export default memo(ProductAttributeBoardColumnsPanel);
