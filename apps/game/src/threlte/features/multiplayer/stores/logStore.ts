import { writable } from 'svelte/store';

export interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'error' | 'warn';
  timestamp: string;
}

const createLogStore = () => {
  const { subscribe, update } = writable<LogEntry[]>([]);

  return {
    subscribe,
    addLog: (message: string, type: LogEntry['type'] = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      const newEntry: LogEntry = { message, type, timestamp };
      update(logs => [...logs, newEntry].slice(-100)); // Keep last 100 logs
    },
    clearLogs: () => update(() => [])
  };
};

export const logStore = createLogStore();
