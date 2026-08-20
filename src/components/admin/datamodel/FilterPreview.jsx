import React, { memo, useCallback, useState } from 'react';
import { Button, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { ChevronDownRegular, ChevronRightRegular } from '@fluentui/react-icons';

const COLLAPSE_CHARS = 80;

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  preview: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    wordBreak: 'break-all',
  },
  previewCollapsed: {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
  },
  toggle: {
    alignSelf: 'flex-start',
  },
});

/**
 * Compacte OData-$filter-preview. Lange filters (veel one-of-waarden) starten ingeklapt.
 *
 * @param {{ label: string, value: string }} props
 */
function FilterPreview({ label, value }) {
  const styles = useStyles();
  const [expanded, setExpanded] = useState(false);
  const text = String(value || '').trim();
  const canCollapse = text.length > COLLAPSE_CHARS;
  const collapsed = canCollapse && !expanded;
  const body = `${label} = ${text}`;
  const previewClass = mergeClasses(styles.preview, collapsed && styles.previewCollapsed);

  const toggleExpanded = useCallback(() => {
    setExpanded((current) => !current);
  }, []);

  if (!text) return null;

  return (
    <div className={styles.root}>
      {canCollapse ? (
        <Button
          className={styles.toggle}
          size="small"
          appearance="subtle"
          icon={expanded ? <ChevronDownRegular /> : <ChevronRightRegular />}
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide full filter' : 'Show full filter'}
          onClick={toggleExpanded}
        >
          {expanded ? 'Hide full filter' : 'Show full filter'}
        </Button>
      ) : null}
      <div className={previewClass} title={collapsed ? body : undefined}>
        {body}
      </div>
    </div>
  );
}

export default memo(FilterPreview);
