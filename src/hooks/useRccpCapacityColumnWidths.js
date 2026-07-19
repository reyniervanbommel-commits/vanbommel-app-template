import { useMemo } from 'react';
import {
  CAPACITY_PLANNING_COLUMNS,
  computeCapacityColumnWidths,
} from '../components/rccp/rccpCapacityPlanningColumns';

export function useRccpCapacityColumnWidths(rows) {
  return useMemo(
    () => computeCapacityColumnWidths(rows),
    [rows],
  );
}
