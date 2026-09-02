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

function PurchaseOrderTableZoomControl() {
  const styles = useStyles();
  const [zoom, setZoom] = useState(() => getPoTableZoom());

  useEffect(() => subscribePoTableZoom(setZoom), []);

  const zoomOut = useCallback(() => {
    setPoTableZoom(stepPoTableZoom(getPoTableZoom(), -1));
  }, []);
  const zoomIn = useCallback(() => {
    setPoTableZoom(stepPoTableZoom(getPoTableZoom(), 1));
  }, []);
  const reset = useCallback(() => {
    setPoTableZoom(PO_TABLE_ZOOM_DEFAULT);
  }, []);

  return (
    <div className={styles.root} role="group" aria-label="Table zoom">
      <Button
        appearance="subtle"
        size="small"
        icon={<SubtractRegular />}
        aria-label="Zoom out"
        title="Zoom out"
        disabled={zoom === PO_TABLE_ZOOM_MIN}
        onClick={zoomOut}
      />
      <Text>{formatPoTableZoomPercent(zoom)}</Text>
      <Button
        appearance="subtle"
        size="small"
        icon={<AddRegular />}
        aria-label="Zoom in"
        title="Zoom in"
        disabled={zoom === PO_TABLE_ZOOM_MAX}
        onClick={zoomIn}
      />
      {zoom !== PO_TABLE_ZOOM_DEFAULT ? (
        <Button appearance="subtle" size="small" aria-label="Reset zoom to 85%" title="Reset zoom to 85%" onClick={reset}>
          Reset
        </Button>
      ) : null}
    </div>
  );
}

export default memo(PurchaseOrderTableZoomControl);
