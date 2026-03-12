import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface Props {
  placeholders: string[];
  onChange: (placeholders: string[]) => void;
  onClose: () => void;
}

export function PlaceholderManager({ placeholders, onChange, onClose }: Props) {
  const [newValue, setNewValue] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newValue.trim() && !placeholders.includes(newValue.trim())) {
      onChange([...placeholders, newValue.trim()]);
      setNewValue('');
    }
  };

  const handleRemove = (p: string) => {
    onChange(placeholders.filter(x => x !== p));
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
            添加特殊字符串（如 <code>&lt;LINE&gt;</code>, <code>{'{0}'}</code>）进行全局高亮和严格校验。
          </p>

          <form onSubmit={handleAdd} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder="例如 %1$s"
              className="flex-1 border border-gray-300 bg-white px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
            />
            <button
              type="submit"
              disabled={!newValue.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-1" /> 添加
            </button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {placeholders.length === 0 ? (
              <p className="text-sm text-gray-500 italic text-center py-4">未配置占位符。</p>
            ) : (
              placeholders.map(p => (
                <div key={p} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                  <span className="font-mono text-sm text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">{p}</span>
                  <button
                    onClick={() => handleRemove(p)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="移除"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
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
