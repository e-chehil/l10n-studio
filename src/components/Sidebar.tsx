import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Entry } from '../types';
import { useFilteredEntries } from '../hooks/useFilteredEntries';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import debounce from 'lodash.debounce';

interface Props {
  state: AppState;
  onSelect: (index: number) => void;
  onFilterChange: (filters: AppState['filters']) => void;
}

export function Sidebar({ state, onSelect, onFilterChange }: Props) {
  const { entries, order, currentIndex, filters } = state;
  const [searchValue, setSearchValue] = useState(filters.search);

  const filtersRef = useRef(filters);
  const onFilterChangeRef = useRef(onFilterChange);

  useEffect(() => {
    filtersRef.current = filters;
    onFilterChangeRef.current = onFilterChange;
  }, [filters, onFilterChange]);

  // Debounce search filter updates
  const debouncedSearch = useRef(
    debounce((val: string) => {
      onFilterChangeRef.current({ ...filtersRef.current, search: val });
    }, 300)
  ).current;

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    debouncedSearch(e.target.value);
  };

  const files = useMemo(() => {
    const set = new Set<string>();
    order.forEach(id => set.add(entries[id].File));
    return Array.from(set).sort();
  }, [entries, order]);

  const filteredOrder = useFilteredEntries(entries, order, filters);

  const completedCount = order.filter(id => entries[id].status === 'completed').length;
  const progress = order.length > 0 ? (completedCount / order.length) * 100 : 0;

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentFilteredIndex = filteredOrder.indexOf(order[currentIndex]);
    if (currentFilteredIndex >= 0 && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({ index: currentFilteredIndex });
    }
  }, [currentIndex, filteredOrder, order]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const currentFilteredIndex = filteredOrder.indexOf(order[currentIndex]);
      if (currentFilteredIndex >= 0) {
        let nextIndex = currentFilteredIndex;
        if (e.key === 'ArrowUp' && currentFilteredIndex > 0) {
          nextIndex = currentFilteredIndex - 1;
        } else if (e.key === 'ArrowDown' && currentFilteredIndex < filteredOrder.length - 1) {
          nextIndex = currentFilteredIndex + 1;
        }
        if (nextIndex !== currentFilteredIndex) {
          const nextGlobalIndex = order.indexOf(filteredOrder[nextIndex]);
          onSelect(nextGlobalIndex);
        }
      }
    }
  };

  const renderItem = useCallback((index: number) => {
    const id = filteredOrder[index];
    const entry = entries[id];
    const isSelected = order[currentIndex] === id;
    const globalIndex = order.indexOf(id);

    return (
      <div
        onClick={() => {
          onSelect(globalIndex);
          containerRef.current?.focus();
        }}
        className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors ${
          isSelected ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'
        }`}
      >
        <div className="flex justify-between items-start mb-1">
          <span className="text-xs font-mono text-gray-500 truncate mr-2" title={entry.Key}>
            {entry.Key}
          </span>
          {entry.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
          {entry.status === 'flagged' && <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />}
        </div>
        <p className="text-sm text-gray-800 line-clamp-2">{entry.English_Original}</p>
      </div>
    );
  }, [filteredOrder, entries, order, currentIndex, onSelect]);

  return (
    <div className="w-full bg-gray-50 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">进度</h2>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
          <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="text-xs text-gray-500 text-right">{completedCount} / {order.length}</p>
      </div>

      <div className="p-4 border-b border-gray-200 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">过滤器</h2>
        
        <select
          value={filters.file}
          onChange={e => onFilterChange({ ...filters, file: e.target.value })}
          className="w-full text-sm border border-gray-300 bg-white px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        >
          <option value="">所有文件</option>
          {files.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={filters.diffTeam}
            onChange={e => onFilterChange({ ...filters, diffTeam: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>与团队中文不同</span>
        </label>

        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={filters.emptyOfficial}
            onChange={e => onFilterChange({ ...filters, emptyOfficial: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>官方中文为空</span>
        </label>

        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={filters.flagged}
            onChange={e => onFilterChange({ ...filters, flagged: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>仅显示存疑</span>
        </label>

        <input
          type="text"
          placeholder="搜索..."
          value={searchValue}
          onChange={handleSearchChange}
          className="w-full text-sm border border-gray-300 bg-white px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        />
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-hidden outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {filteredOrder.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400 px-4 text-center">
            没有符合当前过滤条件的词条
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: '100%' }}
            totalCount={filteredOrder.length}
            itemContent={renderItem}
          />
        )}
      </div>
    </div>
  );
}
