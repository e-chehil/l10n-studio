import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Entry } from '../types';
import { splitByPlaceholders } from '../utils';
import debounce from 'lodash.debounce';

interface Props {
  key?: string;
  entry: Entry;
  placeholders: string[];
  onChange: (value: string) => void;
  onConfirm: (value: string) => void;
  onNext: () => void;
  onFlag: () => void;
}

export function EditorArea({ entry, placeholders, onChange, onConfirm, onNext, onFlag }: Props) {
  const [value, setValue] = useState(entry.Chinese_Mod);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastSentValueRef = useRef(entry.Chinese_Mod);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Debounce onChange to avoid excessive re-renders and DB writes
  const debouncedOnChange = useRef(
    debounce((val: string) => {
      lastSentValueRef.current = val;
      onChangeRef.current(val);
    }, 300)
  ).current;

  useEffect(() => {
    return () => {
      debouncedOnChange.flush();
    };
  }, [debouncedOnChange]);

  // Sync value when entry changes from outside (e.g., Undo)
  useEffect(() => {
    if (entry.Chinese_Mod !== lastSentValueRef.current) {
      setValue(entry.Chinese_Mod);
      lastSentValueRef.current = entry.Chinese_Mod;
    }
  }, [entry.Chinese_Mod]);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      // Only grab focus if it's not currently in another interactive element (e.g. sidebar search)
      const active = document.activeElement;
      const isInOtherInput = active instanceof HTMLInputElement || active instanceof HTMLSelectElement;
      if (!isInOtherInput) {
        textareaRef.current.focus();
      }
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [entry.Key]);

  // Restore focus after mount only if no other element has focus
  useEffect(() => {
    if (textareaRef.current && document.activeElement === document.body) {
      textareaRef.current.focus();
    }
  }, []);

  // Sync scroll between textarea and overlay
  const handleScroll = () => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    debouncedOnChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        debouncedOnChange.flush();
        onConfirm(value);
      } else if (!e.shiftKey) {
        e.preventDefault();
        debouncedOnChange.flush();
        onNext();
      }
    } else if (e.key === 'm' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      debouncedOnChange.flush();
      onFlag();
    }
  };

  const parts = splitByPlaceholders(value, placeholders);

  return (
    <div className="relative w-full h-full border border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white overflow-hidden">
      {/* Overlay for highlighting */}
      <div
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none p-3 whitespace-pre-wrap wrap-break-word overflow-hidden text-gray-900 font-sans text-base leading-relaxed"
        aria-hidden="true"
      >
        {parts.map((part, i) =>
          part.isPlaceholder ? (
            <span
              key={i}
              className="bg-purple-600 text-white rounded"
            >
              {part.text}
            </span>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
        {value.endsWith('\n') ? <br /> : null}
      </div>

      {/* Actual textarea */}
      <textarea
        id="mod-editor"
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        className="relative w-full h-full p-3 bg-transparent text-transparent text-transparent-selection caret-black outline-none resize-none font-sans text-base leading-relaxed overflow-y-auto"
        spellCheck={false}
      />
    </div>
  );
}
