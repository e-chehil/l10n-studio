import { useMemo } from 'react';
import { AppState } from '../types';

export function useFilteredEntries(
  entries: Record<string, AppState['entries'][string]>,
  order: string[],
  filters: AppState['filters']
): string[] {
  return useMemo(() => {
    return order.filter(id => {
      const entry = entries[id];
      if (filters.file && entry.File !== filters.file) return false;
      if (filters.diffTeam && entry.Chinese_Mod === entry.Chinese_Team) return false;
      if (filters.emptyOfficial && entry.Chinese_Official.trim() !== '') return false;
      if (filters.flagged && entry.status !== 'flagged') return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        return (
          entry.Key.toLowerCase().includes(s) ||
          entry.English_Original.toLowerCase().includes(s) ||
          entry.Chinese_Mod.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [entries, order, filters]);
}
