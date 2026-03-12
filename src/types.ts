export interface Entry {
  id: string;
  File: string;
  Key: string;
  English_Original: string;
  Chinese_Official: string;
  Chinese_Team: string;
  Chinese_Mod: string;
  status: 'pending' | 'completed' | 'flagged';
}

export interface HistoryAction {
  type: 'update_entry';
  entryId: string;
  before: Partial<Entry>;
  after: Partial<Entry>;
  timestamp: number;
}

export interface AppState {
  entries: Record<string, Entry>;
  order: string[];
  placeholders: string[];
  currentIndex: number;
  filters: {
    file: string;
    diffTeam: boolean;
    emptyOfficial: boolean;
    flagged: boolean;
    search: string;
  };
  history: {
    past: HistoryAction[];
    future: HistoryAction[];
  };
}
