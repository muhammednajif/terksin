import { useState, useCallback } from 'react';
import type { TimeRange } from '../types';

export function useTimeRange(initial: TimeRange = 30) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initial);
  const changeTimeRange = useCallback((t: TimeRange) => setTimeRange(t), []);
  return { timeRange, changeTimeRange };
}
