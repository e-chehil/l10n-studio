import React, { useState } from 'react';
import { X, Plus, Regex } from 'lucide-react';
import { validateRegex } from '../utils';

const REGEX_PREFIX = 're:';

interface Props {
  placeholders: string[];
  onChange: (placeholders: string[]) => void;
  onClose: () => void;
}

export function PlaceholderManager({ placeholders, onChange, onClose }: Props) {
  const [newValue, setNewValue] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [regexError, setRegexError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newValue.trim();
    if (!trimmed) return;

    const entry = isRegex ? REGEX_PREFIX + trimmed : trimmed;

    if (placeholders.includes(entry)) return;

    if (isRegex) {
      const err = validateRegex(trimmed);
      if (err) {
        setRegexError(err);
        return;
      }
    }

    onChange([...placeholders, entry]);
    setNewValue('');
    setRegexError(null);
  };

  const handleRemove = (p: string) => {
    onChange(placeholders.filter(x => x !== p));
  };

  const handleInputChange = (val: string) => {
    setNewValue(val);
    if (isRegex && val.trim()) {
      setRegexError(validateRegex(val.trim()));
    } else {
      setRegexError(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">占位符 / 校验字典</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            添加纯文本字符串或正则表达式，用于全局高亮和占位符校验。
          </p>

          <form onSubmit={handleAdd} className="mb-6">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newValue}
                  onChange={e => handleInputChange(e.target.value)}
                  placeholder={isRegex ? '例如 <[^>]+> 或 %\\d+\\$s' : '例如 <LINE>'}
                  className={`w-full border bg-white px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors ${
                    isRegex ? 'font-mono pl-9' : ''
                  } ${regexError ? 'border-red-400' : 'border-gray-300'}`}
                />
                {isRegex && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-orange-500 font-bold select-none">/</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRegex(!isRegex);
                  setRegexError(null);
                }}
                className={`p-2 rounded-md border transition-colors ${
                  isRegex
                    ? 'bg-orange-50 border-orange-300 text-orange-600'
                    : 'bg-white border-gray-300 text-gray-400 hover:text-gray-600'
                }`}
                title={isRegex ? '当前：正则模式' : '当前：纯文本模式'}
              >
                <Regex className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={!newValue.trim() || !!regexError}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Plus className="w-4 h-4 mr-1" /> 添加
              </button>
            </div>
            {regexError && (
              <p className="mt-1.5 text-xs text-red-500">正则语法错误：{regexError}</p>
            )}
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {placeholders.length === 0 ? (
              <p className="text-sm text-gray-500 italic text-center py-4">未配置占位符。</p>
            ) : (
              placeholders.map(p => {
                const isRe = p.startsWith(REGEX_PREFIX);
                const display = isRe ? p.slice(REGEX_PREFIX.length) : p;
                return (
                  <div key={p} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                    <div className="flex items-center space-x-2 min-w-0">
                      {isRe && (
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 border border-orange-200">
                          正则
                        </span>
                      )}
                      <span className={`font-mono text-sm truncate ${isRe ? 'text-orange-700 bg-orange-50' : 'text-purple-700 bg-purple-100'} px-1.5 py-0.5 rounded`}>
                        {display}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemove(p)}
                      className="text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-2"
                      title="移除"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
