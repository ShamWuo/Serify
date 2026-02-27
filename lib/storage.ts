export interface SessionSummary {
    id: string;
    title: string;
    type: string;
    date: string;
    status: 'In Progress' | 'Completed';
    result?: 'Strong' | 'Gaps Found' | 'Default';
}

const STORAGE_KEY = 'serify_sessions_history';

export const storage = {
    getHistory: (): SessionSummary[] => {
        if (typeof window === 'undefined') return [];
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse history", e);
            return [];
        }
    },

    saveSession: (session: SessionSummary) => {
        if (typeof window === 'undefined') return;
        const history = storage.getHistory();
        const index = history.findIndex(s => s.id === session.id);

        let newHistory;
        if (index >= 0) {
            newHistory = [...history];
            newHistory[index] = { ...newHistory[index], ...session };
        } else {
            newHistory = [session, ...history];
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    },

    removeSession: (id: string) => {
        if (typeof window === 'undefined') return;
        const history = storage.getHistory();
        const newHistory = history.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    }
};
