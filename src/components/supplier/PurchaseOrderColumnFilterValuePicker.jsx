import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Text } from '@fluentui/react-components';
import { DismissRegular } from '@fluentui/react-icons';
import { getValueSuggestions } from '../../utils/columnUniqueValues';
import { usePurchaseOrderColumnFilterValuePickerStyles } from './purchaseOrderColumnFilterValuePickerStyles';

function splitPastedLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function dedupeKeyFor(value, isNumber) {
  return isNumber ? String(Number(value)) : String(value).toLowerCase();
}

export default function PurchaseOrderColumnFilterValuePicker({
  mode,
  value,
  onChange,
  uniqueValues = [],
  isNumber = false,
  columnLabel,
}) {
  const styles = usePurchaseOrderColumnFilterValuePickerStyles();
  const [inputText, setInputText] = useState('');
  const [ignoredHint, setIgnoredHint] = useState('');
  const [focused, setFocused] = useState(false);
  const isMulti = mode === 'multi';

  useEffect(() => {
    if (!isMulti) setInputText(value || '');
  }, [value, isMulti]);

  const chips = isMulti && Array.isArray(value) ? value : [];

  const suggestions = useMemo(() => {
    if (inputText.trim()) return getValueSuggestions(uniqueValues, inputText);
    // Toon max. 10 waarden bij focus op leeg veld (browse-bij-focus, D365-stijl).
    if (focused && uniqueValues.length) return getValueSuggestions(uniqueValues, '', 10);
    return { items: [], totalMatches: 0, truncated: false };
  }, [uniqueValues, inputText, focused]);

  const commitSingleValue = useCallback((nextValue) => {
    setIgnoredHint('');
    onChange(nextValue);
  }, [onChange]);

  const addMultiValues = useCallback((rawCandidates) => {
    let ignoredCount = 0;
    const existingKeys = new Set(chips.map((chip) => dedupeKeyFor(chip, isNumber)));
    const additions = [];
    rawCandidates.forEach((candidate) => {
      if (isNumber && !Number.isFinite(Number(candidate))) {
        ignoredCount += 1;
        return;
      }
      const key = dedupeKeyFor(candidate, isNumber);
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      additions.push(candidate);
    });
    if (additions.length) {
      onChange([...chips, ...additions]);
    }
    setIgnoredHint(ignoredCount > 0 ? `${ignoredCount} value${ignoredCount === 1 ? '' : 's'} ignored — not numeric` : '');
  }, [chips, isNumber, onChange]);

  const handleInputChange = useCallback((event) => {
    const nextText = event.target.value;
    setInputText(nextText);
    if (!isMulti) {
      commitSingleValue(nextText);
    }
  }, [isMulti, commitSingleValue]);

  const handleKeyDown = useCallback((event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (isMulti && inputText.trim()) {
      addMultiValues([inputText.trim()]);
      setInputText('');
    }
  }, [addMultiValues, inputText, isMulti]);

  const handlePaste = useCallback((event) => {
    const pastedText = event.clipboardData?.getData('text') || '';
    const lines = splitPastedLines(pastedText);
    if (isMulti) {
      if (lines.length) {
        event.preventDefault();
        addMultiValues(lines);
        setInputText('');
      }
      return;
    }
    if (lines.length > 1) {
      event.preventDefault();
      commitSingleValue(lines[0]);
      setInputText(lines[0]);
      setIgnoredHint(`${lines.length - 1} value${lines.length - 1 === 1 ? '' : 's'} ignored — only the first line is used`);
    }
  }, [addMultiValues, commitSingleValue, isMulti]);

  const handleFocus = useCallback(() => setFocused(true), []);

  // Kort timeout zodat een klik op een suggestie-optie de blur overleeft.
  const handleBlur = useCallback(() => setTimeout(() => setFocused(false), 150), []);

  const handleSuggestionClick = useCallback((suggestionValue) => {
    if (isMulti) {
      addMultiValues([String(suggestionValue)]);
      setInputText('');
    } else {
      const val = String(suggestionValue);
      commitSingleValue(val);
      setInputText(val);
    }
    setFocused(false);
  }, [addMultiValues, commitSingleValue, isMulti]);

  const handleRemoveChip = useCallback((index) => {
    onChange(chips.filter((_, chipIndex) => chipIndex !== index));
  }, [chips, onChange]);

  return (
    <div className={styles.pickerWrap}>
      <Input
        className={styles.filterValueField}
        size="small"
        value={isMulti ? inputText : (inputText || value || '')}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={isMulti ? 'Type a value or paste a list' : 'Value'}
        aria-label={`Filter value for ${columnLabel}`}
      />
      {suggestions.items.length ? (
        <div
          className={styles.pickerSuggestions}
          role="listbox"
          aria-label={`Suggestions for ${columnLabel}`}
        >
          {suggestions.items.map((suggestion) => (
            <Button
              key={String(suggestion)}
              className={styles.pickerSuggestionOption}
              appearance="transparent"
              size="small"
              role="option"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {String(suggestion)}
            </Button>
          ))}
          {suggestions.truncated ? (
            <Text className={styles.pickerHint}>
              {`Showing ${suggestions.items.length} of ${suggestions.totalMatches} — refine your search to see more`}
            </Text>
          ) : null}
        </div>
      ) : null}
      {isMulti && chips.length ? (
        <div className={styles.pickerChipList}>
          {chips.map((chip, index) => (
            <span key={`${dedupeKeyFor(chip, isNumber)}-${index}`} className={styles.pickerChip}>
              <span className={styles.pickerChipLabel}>{String(chip)}</span>
              <Button
                className={styles.pickerChipRemove}
                appearance="transparent"
                size="small"
                icon={<DismissRegular />}
                aria-label={`Remove ${chip}`}
                onClick={() => handleRemoveChip(index)}
              />
            </span>
          ))}
        </div>
      ) : null}
      {ignoredHint ? <Text className={styles.pickerHint}>{ignoredHint}</Text> : null}
    </div>
  );
}
