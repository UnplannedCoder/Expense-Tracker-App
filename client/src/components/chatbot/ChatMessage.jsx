import React, { useState } from 'react';
import { FaCopy, FaCheck } from 'react-icons/fa';
import RobotAvatar from './RobotAvatar';

/**
 * Minimal markdown-to-JSX renderer.
 * Handles: ## headings, **bold**, *italic*, `code`, bullet lists,
 * numbered lists, --- dividers, and line breaks.
 */
const renderMarkdown = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H2 heading: ## Title
    if (/^##\s/.test(line)) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-3 mb-1.5 border-b border-slate-100 dark:border-slate-700 pb-1">
          {inlineMarkdown(line.replace(/^##\s/, ''))}
        </h2>
      );
      i++;
      continue;
    }

    // H3 heading: ### Title
    if (/^###\s/.test(line)) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-2 mb-1">
          {inlineMarkdown(line.replace(/^###\s/, ''))}
        </h3>
      );
      i++;
      continue;
    }

    // Horizontal rule: ---
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={`hr-${i}`} className="border-slate-100 dark:border-slate-700 my-2" />);
      i++;
      continue;
    }

    // Bullet list item
    if (/^[-*]\s/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[-*]\s/, '').trim());
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-none space-y-1.5 my-1.5">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-indigo-400 mt-0.5 flex-shrink-0 text-xs">•</span>
              <span className="text-sm leading-relaxed">{inlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\.\s/, '').trim());
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-none space-y-1.5 my-1.5">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-indigo-400 font-semibold flex-shrink-0 min-w-[1.2rem] text-sm">{idx + 1}.</span>
              <span className="text-sm leading-relaxed">{inlineMarkdown(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line — small spacer
    if (line.trim() === '') {
      elements.push(<div key={`br-${i}`} className="h-1" />);
      i++;
      continue;
    }

    // Italic-only line (disclaimer / note lines that start with *)
    if (/^\*[^*]/.test(line.trim()) && line.trim().endsWith('*')) {
      elements.push(
        <p key={`italic-${i}`} className="text-xs text-slate-400 dark:text-slate-500 italic leading-relaxed">
          {inlineMarkdown(line.trim().slice(1, -1))}
        </p>
      );
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
        {inlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return elements;
};

/**
 * Process inline markdown within a single line:
 * **bold**, *italic*, `code`, [link](url)
 */
const inlineMarkdown = (text) => {
  const parts = [];
  // Match bold, italic, inline code, and markdown links
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-slate-800 dark:text-slate-100">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*')) {
      parts.push(<em key={match.index} className="italic text-slate-500 dark:text-slate-400">{token.slice(1, -1)}</em>);
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={match.index} className="bg-slate-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[')) {
      // Markdown link: [label](url)
      const labelMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (labelMatch) {
        parts.push(
          <a
            key={match.index}
            href={labelMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            {labelMatch[1]}
          </a>
        );
      }
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

/**
 * ChatMessage
 * Renders a single chat bubble for either user or bot messages.
 * Bot messages support markdown rendering and a copy button.
 */
const ChatMessage = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be unavailable — fail silently
    }
  };

  const timeStr = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : '';

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2 animate-fade-in group">
        {/* Timestamp — visible on hover */}
        <span className="text-xs text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1 select-none">
          {timeStr}
        </span>

        {/* User bubble */}
        <div className="max-w-[78%]">
          <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-br-sm shadow-md shadow-indigo-600/20 text-sm leading-relaxed break-words">
            {message.message}
          </div>
        </div>

        {/* User avatar */}
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mb-1 text-white text-xs font-bold shadow-md shadow-indigo-600/20">
          U
        </div>
      </div>
    );
  }

  // Bot message
  return (
    <div className="flex items-end gap-2 animate-fade-in group">
      {/* Bot avatar */}
      <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center flex-shrink-0 mb-1 shadow-sm overflow-hidden">
        <RobotAvatar variant="small" />
      </div>

      <div className="max-w-[82%] flex flex-col gap-1">
        {/* Bot bubble */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm text-sm text-slate-700 dark:text-slate-200 break-words">
          <div className="space-y-1">
            {renderMarkdown(message.message)}
          </div>
        </div>

        {/* Timestamp + copy button row */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-slate-400 dark:text-slate-500 select-none">{timeStr}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            title="Copy message"
          >
            {copied ? <FaCheck size={10} /> : <FaCopy size={10} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
