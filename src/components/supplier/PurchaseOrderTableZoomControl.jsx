import React, { memo, useCallback, useEffect, useState } from 'react';
import { Button, Text, makeStyles, tokens } from '@fluentui/react-components';
import { AddRegular, SubtractRegular } from '@fluentui/react-icons';
import {
  PO_TABLE_ZOOM_DEFAULT,
  PO_TABLE_ZOOM_MAX,
  PO_TABLE_ZOOM_MIN,
  formatPoTableZoomPercent,
  getPoTableZoom,
  setPoTableZoom,
  stepPoTableZoom,
  subscribePoTableZoom,
} from '../../utils/poTableZoom';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    flexShrink: 0,
  },
});

function PurchaseOrderTableZoomControl({ value, onChange, disabled = false }) {
  const styles = useStyles();
  const [storeZoom, setStoreZoom] = useState(() => getPoTableZoom());

  useEffect(() => subscribePoTableZoom(setStoreZoom), []);

  const zoom = value ?? storeZoom;
  const commit = onChange || setPoTableZoom;

  const zoomOut = useCallback(() => {
    commit(stepPoTableZoom(zoom, -1));
  }, [commit, zoom]);
  const zoomIn = useCallback(() => {
    commit(stepPoTableZoom(zoom, 1));
  }, [commit, zoom]);
  const reset = useCallback(() => {
    commit(PO_TABLE_ZOOM_DEFAULT);
  }, [commit]);

  return (
    <div className={styles.root} role="group" aria-label="Table zoom">
      <Button
        appearance="subtle"
        size="small"
        icon={<SubtractRegular />}
        aria-label="Zoom out"
        title="Zoom out"
        disabled={disabled || zoom === PO_TABLE_ZOOM_MIN}
        onClick={zoomOut}
      />
      <Text>{formatPoTableZoomPercent(zoom)}</Text>
      <Button
        appearance="subtle"
        size="small"
        icon={<AddRegular />}
        aria-label="Zoom in"
        title="Zoom in"
        disabled={disabled || zoom === PO_TABLE_ZOOM_MAX}
        onClick={zoomIn}
      />
      {zoom !== PO_TABLE_ZOOM_DEFAULT ? (
        <Button appearance="subtle" size="small" aria-label="Reset zoom to 85%" title="Reset zoom to 85%" disabled={disabled} onClick={reset}>
          Reset
        </Button>
      ) : null}
    </div>
  );
}

export default memo(PurchaseOrderTableZoomControl);
