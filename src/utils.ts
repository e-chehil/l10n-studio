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

const REGEX_PREFIX = 're:';

function isRegexPlaceholder(p: string): boolean {
  return p.startsWith(REGEX_PREFIX);
}

function getRegexSource(p: string): string {
  return p.slice(REGEX_PREFIX.length);
}

// Cache for compiled regex patterns
const regexCache = new Map<string, RegExp>();

function buildPlaceholderRegex(placeholders: string[], withCapture: boolean): RegExp {
  const cacheKey = placeholders.join('\x00') + (withCapture ? '\x01' : '');
  const cached = regexCache.get(cacheKey);
  if (cached) {
    cached.lastIndex = 0;
    return cached;
  }

  // Split into literal strings and regex patterns
  const literals: string[] = [];
  const regexPatterns: string[] = [];

  for (const p of placeholders) {
    if (isRegexPlaceholder(p)) {
      regexPatterns.push(getRegexSource(p));
    } else {
      literals.push(p);
    }
  }

  // Sort literals by length descending so longer matches win
  literals.sort((a, b) => b.length - a.length);

  const parts: string[] = [
    ...regexPatterns,
    ...literals.map(escapeRegExp),
  ];

  if (parts.length === 0) return /(?!)/g; // match nothing

  const combined = parts.join('|');
  const regex = new RegExp(withCapture ? `(${combined})` : combined, 'g');
  regexCache.set(cacheKey, regex);
  return regex;
}

/** Validate a regex string. Returns error message or null if valid. */
export function validateRegex(pattern: string): string | null {
  try {
    new RegExp(pattern);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
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
  const regex = buildPlaceholderRegex(placeholders, false);
  regex.lastIndex = 0;
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

export function splitByPlaceholders(text: string, placeholders: string[]): { text: string, isPlaceholder: boolean }[] {
  if (!text) return [];
  if (placeholders.length === 0) return [{ text, isPlaceholder: false }];

  const regex = buildPlaceholderRegex(placeholders, true);
  regex.lastIndex = 0;
  const parts = text.split(regex);

  // Build a test regex to check if a fragment is a placeholder match
  const testRegex = buildPlaceholderRegex(placeholders, false);

  return parts.filter(part => part !== '').map(part => {
    testRegex.lastIndex = 0;
    const fullMatch = testRegex.exec(part);
    return {
      text: part,
      isPlaceholder: fullMatch !== null && fullMatch[0] === part,
    };
  });
}
