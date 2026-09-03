import React, { memo, useCallback, useMemo } from 'react';
import { Spinner, Switch, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import AdminInfoHint from './AdminInfoHint';
import DataModelCollapsibleSection from './DataModelCollapsibleSection';
import { DATA_MODEL_INFO } from './dataModelInfoCopy';
import { sortFlaggedFirst } from './entityConfigTableUtils';

const useStyles = makeStyles({
  list: { display: 'flex', flexDirection: 'column', ...shorthands.gap('8px') },
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
  const sortedNames = useMemo(
    () => sortFlaggedFirst(names, (entry) => entry.visible),
    [names],
  );
  return (
    <DataModelCollapsibleSection
      title="PO board columns"
      titleExtra={<AdminInfoHint text={DATA_MODEL_INFO.pavBoardColumns} label="About PO board columns" />}
    >
      <Text className={styles.hint} block>
        Board cells use Text value when Attribute value is empty. Product number matches Items ItemNumber and the PO line ItemNumber.
      </Text>
      {loading ? <Spinner label="Loading attribute names..." /> : null}
      {error ? <Text className={styles.error} block>{error}</Text> : null}
      {!loading && !sortedNames.length ? (
        <Text className={styles.empty} block>No attribute names yet. Sync this entity first.</Text>
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
