import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * CodeBlock — agent thought process, tool call logs, raw JSON responses.
 * Dark-surface, monospace, with optional title bar and copy action.
 *
 * Props:
 *   code     — string | object  (objects are JSON.stringify'd)
 *   language — string           (display label only)
 *   title    — string           (optional header bar text)
 *   maxHeight — string          (CSS max-height, default '320px')
 *   collapsible — boolean       (wraps in <details>)
 */
const CodeBlock = ({ code, language = 'json', title, maxHeight = '320px', collapsible = false, className = '' }) => {
  const [copied, setCopied] = useState(false);
  const raw = typeof code === 'object' ? JSON.stringify(code, null, 2) : (code ?? '');

  const handleCopy = () => {
    navigator.clipboard.writeText(raw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const block = (
    <div className={`rounded overflow-hidden border border-[#2d3748] ${className}`}>
      {/* Title bar */}
      <div className="flex items-center justify-between bg-[#1a1f2e] px-4 py-2 border-b border-[#2d3748]">
        <span className="text-xs font-mono text-[#94a3b8]">{title || language}</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider text-[#475467]">{language}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[#94a3b8] hover:text-white transition-colors"
            title="Copy to clipboard"
          >
            {copied
              ? <Check size={12} strokeWidth={2} className="text-green-400" />
              : <Copy size={12} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
      {/* Content */}
      <pre
        className="vfo-code-block bg-[#0F1117] text-[#e2e8f0] p-4 overflow-auto m-0"
        style={{ maxHeight }}
      >
        <code>{raw}</code>
      </pre>
    </div>
  );

  if (collapsible) {
    return (
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-ink-tertiary hover:text-ink-secondary select-none py-1">
          View raw JSON response
        </summary>
        <div className="mt-2">{block}</div>
      </details>
    );
  }

  return block;
};

export default CodeBlock;
