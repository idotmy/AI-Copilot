import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Code2, Copy, Check } from 'lucide-react';

interface ChatMessageContentProps {
  content: string;
}

function renderFormattedText(text: string) {
  const lines = text.split('\n');

  return (
    <div className="space-y-1 font-sans text-sm">
      {lines.map((line, lIdx) => {
        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
        const lineContent = isBullet ? line.trim().slice(2) : line;

        // Parse inline markdown: **bold**, *italic*, `code`
        const elements: React.ReactNode[] = [];
        const inlineRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
        const parts = lineContent.split(inlineRegex);

        parts.forEach((part, pIdx) => {
          if (!part) return;
          if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            elements.push(
              <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">
                {part.slice(2, -2)}
              </strong>
            );
          } else if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
            elements.push(
              <em key={pIdx} className="italic text-slate-800 dark:text-slate-200">
                {part.slice(1, -1)}
              </em>
            );
          } else if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
            elements.push(
              <code
                key={pIdx}
                className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-[#21262D] text-sky-700 dark:text-cyan-400"
              >
                {part.slice(1, -1)}
              </code>
            );
          } else {
            elements.push(part);
          }
        });

        if (isBullet) {
          return (
            <div key={lIdx} className="flex items-start gap-2 ml-2 my-1">
              <span className="text-sky-600 dark:text-cyan-400 font-bold">•</span>
              <span className="leading-relaxed">{elements}</span>
            </div>
          );
        }

        if (line.trim() === '') {
          return <div key={lIdx} className="h-1.5" />;
        }

        return (
          <p key={lIdx} className="leading-relaxed">
            {elements}
          </p>
        );
      })}
    </div>
  );
}

export const ChatMessageContent: React.FC<ChatMessageContentProps> = ({ content }) => {
  const [showRawDetails, setShowRawDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if content has embedded JSON or code blocks or starts with JSON
  const trimmed = content.trim();
  const isJsonBlock = trimmed.startsWith('{') && trimmed.endsWith('}');
  const hasCodeBlock = trimmed.includes('```json') || trimmed.includes('```');

  if (isJsonBlock) {
    let parsed: any = null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // not valid JSON
    }

    if (parsed) {
      // Format human-friendly summary
      const title = parsed.message || parsed.description || (parsed.domainName ? `Domain: ${parsed.domainName}` : 'Transaction Parameters Verified');
      const sub = parsed.available !== undefined ? (parsed.available ? 'Status: Available for instant registration' : 'Status: Already minted on Arbitrum One') : null;

      return (
        <div className="space-y-2">
          <div className="font-sans text-sm">{title}</div>
          {sub && <div className="text-xs text-sky-700 dark:text-cyan-400 font-mono">{sub}</div>}

          {/* Show Details Toggle Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowRawDetails(!showRawDetails)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-[#21262D] hover:bg-slate-300 dark:hover:bg-[#30363D] text-[11px] font-mono text-slate-700 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <Code2 className="w-3 h-3 text-sky-600 dark:text-cyan-400" />
              <span>{showRawDetails ? 'Hide Details' : 'Show Details'}</span>
              {showRawDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showRawDetails && (
              <div className="mt-2 relative">
                <pre className="p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed border border-slate-700">
                  {JSON.stringify(parsed, null, 2)}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(parsed, null, 2));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  // Handle standard text with optional JSON code snippet hidden behind Show Details
  if (hasCodeBlock) {
    const parts = content.split(/```(?:json)?([\s\S]*?)```/g);
    // If it has text before or after code
    return (
      <div className="space-y-2">
        {parts.map((part, idx) => {
          if (idx % 2 === 0) {
            // Text part
            return part ? (
              <div key={idx}>
                {renderFormattedText(part)}
              </div>
            ) : null;
          } else {
            // Code part -> hide behind Show Details button
            return (
              <div key={idx} className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowRawDetails(!showRawDetails)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-[#21262D] hover:bg-slate-300 dark:hover:bg-[#30363D] text-[11px] font-mono text-slate-700 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <Code2 className="w-3 h-3 text-sky-600 dark:text-cyan-400" />
                  <span>{showRawDetails ? 'Hide Details' : 'Show Details'}</span>
                  {showRawDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showRawDetails && (
                  <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed border border-slate-700">
                    {part.trim()}
                  </pre>
                )}
              </div>
            );
          }
        })}
      </div>
    );
  }

  return renderFormattedText(content);
};
