import React, { memo } from 'react';
import { makeStyles } from '@fluentui/react-components';

export const D365_LOGO_SRC = '/d365-logo.png';

const useStyles = makeStyles({
  logo: {
    width: '16px',
    height: '16px',
    objectFit: 'contain',
    flexShrink: 0,
  },
  logoSmall: {
    width: '14px',
    height: '14px',
    objectFit: 'contain',
    flexShrink: 0,
  },
});

function D365LogoIcon({ size = 'default', alt = 'Dynamics 365', className }) {
  const styles = useStyles();
  const sizeClass = size === 'small' ? styles.logoSmall : styles.logo;
  return (
    <img
      className={className ? `${sizeClass} ${className}` : sizeClass}
      src={D365_LOGO_SRC}
      alt={alt}
      aria-hidden={alt === ''}
    />
  );
}

export default memo(D365LogoIcon);
