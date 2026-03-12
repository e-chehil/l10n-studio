import localforage from 'localforage';
import { useState, useEffect, useCallback } from 'react';
import { AppState, Entry } from './types';
import Papa from 'papaparse';

interface CSVRow {
  File?: string;
  Key?: string;
  English_Original?: string;
  Chinese_Official?: string;
  Chinese_Team?: string;
  Chinese_Mod?: string;
  [key: string]: string | undefined;
}

const STORE_KEY = 'localization_tool_state';

type PersistedAppState = Omit<AppState, 'history'>;

const defaultState: AppState = {
  entries: {},
  order: [],
  placeholders: ['<LINE>', '{0}', '%1$s', '<color=red>', '</color>'],
  currentIndex: 0,
  filters: {
    file: '',
    diffTeam: false,
    emptyOfficial: false,
    flagged: false,
    search: '',
  },
  history: {
    past: [],
    future: [],
  },
};

function persistState(newState: AppState) {
  const { history: _history, ...stateToSave } = newState;
  return localforage
    .setItem<PersistedAppState>(STORE_KEY, stateToSave)
    .catch((err) => console.error('Failed to save state:', err));
}

export function useAppStore() {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDefaultCSV = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/sample.csv');
      if (!res.ok) {
        throw new Error('Default CSV not found');
      }

      const text = await res.text();

      Papa.parse<CSVRow>(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const entries: Record<string, Entry> = {};
          const order: string[] = [];

          results.data.forEach((row) => {
            if (!row.File || !row.Key) return;

            const id = `${row.File}_${row.Key}`;
            entries[id] = {
              id,
              File: row.File,
              Key: row.Key,
              English_Original: row.English_Original || '',
              Chinese_Official: row.Chinese_Official || '',
              Chinese_Team: row.Chinese_Team || '',
              Chinese_Mod: row.Chinese_Mod || '',
              status: 'pending',
            };
            order.push(id);
          });

          const initialState: AppState = {
            ...defaultState,
            entries,
            order,
          };

          setState(initialState);
          void persistState(initialState);
          setLoading(false);
        },
        error: () => {
          setState(defaultState);
          void persistState(defaultState);
          setLoading(false);
        },
      });
    } catch (err) {
      setState(defaultState);
      void persistState(defaultState);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    localforage.getItem<PersistedAppState>(STORE_KEY).then((savedState) => {
      if (savedState && savedState.order && savedState.order.length > 0) {
        setState({
          ...defaultState,
          ...savedState,
          filters: {
            ...defaultState.filters,
            ...savedState.filters,
          },
        });
        setLoading(false);
      } else {
        void loadDefaultCSV();
      }
    });
  }, [loadDefaultCSV]);

  const updateEntry = useCallback((id: string, updates: Partial<Entry>, recordHistory = true) => {
    setState((prev) => {
      if (!prev) return prev;

      const oldEntry = prev.entries[id];
      const before: Partial<Entry> = {};
      const after: Partial<Entry> = {};

      Object.keys(updates).forEach((key) => {
        const k = key as keyof Entry;
        if (oldEntry[k] !== updates[k]) {
          before[k] = oldEntry[k] as any;
          after[k] = updates[k] as any;
        }
      });

      const newState: AppState = {
        ...prev,
        entries: {
          ...prev.entries,
          [id]: { ...prev.entries[id], ...updates },
        },
        history:
          recordHistory && Object.keys(before).length > 0
            ? {
              past: [
                ...prev.history.past,
                {
                  type: 'update_entry' as const,
                  entryId: id,
                  before,
                  after,
                  timestamp: Date.now(),
                },
              ].slice(-100),
              future: [],
            }
            : prev.history,
      };

      void persistState(newState);
      return newState;
    });
  }, []);

  const setPlaceholders = useCallback((placeholders: string[]) => {
    setState((prev) => {
      if (!prev) return prev;
      const newState: AppState = { ...prev, placeholders };
      void persistState(newState);
      return newState;
    });
  }, []);

  const setFilters = useCallback((filters: AppState['filters']) => {
    setState((prev) => {
      if (!prev) return prev;
      const newState: AppState = { ...prev, filters };
      void persistState(newState);
      return newState;
    });
  }, []);

  const setCurrentIndex = useCallback((index: number) => {
    setState((prev) => {
      if (!prev) return prev;
      const newState: AppState = { ...prev, currentIndex: index };
      void persistState(newState);
      return newState;
    });
  }, []);

  const loadCSV = useCallback((entries: Record<string, Entry>, order: string[]) => {
    setState((prev) => {
      if (!prev) return prev;
      const newState: AppState = {
        ...prev,
        entries,
        order,
        currentIndex: 0,
        history: {
          past: [],
          future: [],
        },
      };
      void persistState(newState);
      return newState;
    });
  }, []);

  const clearData = useCallback(() => {
    void loadDefaultCSV();
  }, [loadDefaultCSV]);

  const undo = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.history.past.length === 0) return prev;

      const lastAction = prev.history.past[prev.history.past.length - 1];
      const newPast = prev.history.past.slice(0, -1);

      const newState: AppState = {
        ...prev,
        entries: {
          ...prev.entries,
          [lastAction.entryId]: {
            ...prev.entries[lastAction.entryId],
            ...lastAction.before,
          },
        },
        history: {
          past: newPast,
          future: [lastAction, ...prev.history.future],
        },
      };

      void persistState(newState);
      return newState;
    });
  }, []);

  const redo = useCallback(() => {
    setState((prev) => {
      if (!prev || prev.history.future.length === 0) return prev;

      const nextAction = prev.history.future[0];
      const newFuture = prev.history.future.slice(1);

      const newState: AppState = {
        ...prev,
        entries: {
          ...prev.entries,
          [nextAction.entryId]: {
            ...prev.entries[nextAction.entryId],
            ...nextAction.after,
          },
        },
        history: {
          past: [...prev.history.past, nextAction],
          future: newFuture,
        },
      };

      void persistState(newState);
      return newState;
    });
  }, []);

  return {
    state,
    loading,
    updateEntry,
    setPlaceholders,
    setFilters,
    setCurrentIndex,
    loadCSV,
    clearData,
    undo,
    redo,
  };
}