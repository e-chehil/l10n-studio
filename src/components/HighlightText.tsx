import React from 'react';
import { splitByPlaceholders } from '../utils';

interface Props {
  text: string;
  placeholders: string[];
  className?: string;
}

export function HighlightText({ text, placeholders, className = '' }: Props) {
  const parts = splitByPlaceholders(text, placeholders);

  return (
    <div className={`whitespace-pre-wrap wrap-break-word ${className}`}>
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
    </div>
  );
}
