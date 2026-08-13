import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

export const usePurchaseOrderColumnFilterValuePickerStyles = makeStyles({
  pickerWrap: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    width: '100%',
    minWidth: 0,
    position: 'relative',
  },
  pickerChipList: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('4px'),
    width: '100%',
  },
  pickerChip: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    ...shorthands.padding('2px', '4px', '2px', '8px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorNeutralBackground2,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    maxWidth: '100%',
  },
  pickerChipLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  pickerChipRemove: {
    minWidth: '14px',
    width: '14px',
    height: '14px',
    ...shorthands.padding('0'),
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  pickerSuggestions: {
    // position: absolute houdt de dropdown IN de popover-DOM zodat klikken de popover niet sluit.
    position: 'absolute',
    top: '100%',
    left: '0',
    zIndex: 10,
    // minWidth: max-content laat het vak breder worden als een waarde lang is.
    minWidth: '100%',
    width: 'max-content',
    maxWidth: '480px',
    maxHeight: '220px',
    overflowY: 'auto',
    overflowX: 'hidden',
    boxSizing: 'border-box',
    ...shorthands.padding('4px', '0'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
    display: 'flex',
    flexDirection: 'column',
  },
  pickerSuggestionOption: {
    // Forceer links uitlijning — Fluent UI Button gebruikt standaard center.
    justifyContent: 'flex-start',
    textAlign: 'left',
    alignItems: 'center',
    minWidth: 'auto',
    width: '100%',
    minHeight: '28px',
    height: 'auto',
    ...shorthands.padding('4px', '12px'),
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase300,
    // whiteSpace: nowrap + geen overflow:hidden → de container wordt breder ipv de tekst afgekapt.
    whiteSpace: 'nowrap',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  pickerHint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase200,
  },
  filterValueField: {
    width: '100%',
    maxWidth: '100%',
  },
});
