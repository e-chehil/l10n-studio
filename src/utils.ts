import Papa from 'papaparse';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Entry } from './types';

interface CSVRow {
  File?: string;
  Key?: string;
  English_Original?: string;
  Chinese_Official?: string;
  Chinese_Team?: string;
  Chinese_Mod?: string;
  [key: string]: string | undefined;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Cache for compiled regex patterns
const regexCache = new Map<string, RegExp>();

function getPlaceholderRegex(placeholders: string[], withCapture: boolean = false): RegExp {
  const sorted = [...placeholders].sort((a, b) => b.length - a.length);
  const key = sorted.join('|') + (withCapture ? ':capture' : '');

  if (!regexCache.has(key)) {
    const pattern = sorted.map(escapeRegExp).join('|');
    const regex = new RegExp(withCapture ? `(${pattern})` : pattern, 'g');
    regexCache.set(key, regex);
  }

  return regexCache.get(key)!;
}

export function parseCSV(file: File): Promise<{ entries: Record<string, Entry>, order: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
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
        resolve({ entries, order });
      },
      error: reject,
    });
  });
}

export async function exportToZip(entries: Record<string, Entry>, order: string[]) {
  const zip = new JSZip();
  const grouped: Record<string, Record<string, string>> = {};

  order.forEach(id => {
    const entry = entries[id];
    if (!grouped[entry.File]) {
      grouped[entry.File] = {};
    }
    grouped[entry.File][entry.Key] = entry.Chinese_Mod;
  });

  for (const [fileName, data] of Object.entries(grouped)) {
    const name = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    zip.file(name, JSON.stringify(data, null, 2));
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'localization_export.zip');
}

export function countPlaceholders(text: string, placeholders: string[]): number {
  if (!text || placeholders.length === 0) return 0;
  const regex = getPlaceholderRegex(placeholders, false);
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

export function splitByPlaceholders(text: string, placeholders: string[]): { text: string, isPlaceholder: boolean }[] {
  if (!text) return [];
  if (placeholders.length === 0) return [{ text, isPlaceholder: false }];

  const regex = getPlaceholderRegex(placeholders, true);
  const parts = text.split(regex);

  return parts.filter(part => part !== '').map(part => ({
    text: part,
    isPlaceholder: placeholders.includes(part),
  }));
}
