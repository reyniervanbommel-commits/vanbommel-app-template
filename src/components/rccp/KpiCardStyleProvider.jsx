import React from 'react';
import { KpiCardStyleContext, useKpiCardStyles } from './useKpiCardStyles';

function KpiCardStyleProvider({ children }) {
  const value = useKpiCardStyles();
  return (
    <KpiCardStyleContext.Provider value={value}>
      {children}
    </KpiCardStyleContext.Provider>
  );
}

export default KpiCardStyleProvider;
