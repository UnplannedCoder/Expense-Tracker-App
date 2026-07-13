import React, { useContext, useRef, useEffect, useState, useCallback } from 'react';
import {
  FaTimes,
  FaPaperPlane,
  FaTrash,
  FaChevronDown,
  FaExclamationCircle,
} from 'react-icons/fa';
import { ChatContext } from '../../context/ChatContext';
import { AuthContext } from '../../context/AuthContext';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import QuickActions from './QuickActions';
import RobotAvatar from './RobotAvatar';

/**
 * FinBot
 * The complete floating AI Financial Assistant UI.
 * Renders as:
 *   1. A FAB (Floating Action Button) at the bottom-right — always visible
 *   2. A chat window that slides in above the FAB when opened
 *
 * All state lives in ChatContext — this component is purely presentational.
 */
const FinBot = () => {
  const { user } = useContext(AuthContext);
  const {
    isOpen,
    messages,
    isLoading,
    error,
    toggleChat,
    closeChat,
    sendMessage,
    clearHistory,
  } = useContext(ChatContext);

  const [inputValue, setInputValue] = useState('');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Show/hide scroll-to-bottom button
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowScrollBtn(distFromBottom > 150);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    sendMessage(text);
    setInputValue('');
  }, [inputValue, isLoading, sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (text) => {
    sendMessage(text);
    setInputValue('');
  };

  const handleClearConfirm = () => {
    clearHistory();
    setShowClearConfirm(false);
  };

  // Determine if we should show quick actions
  // Show them only when there are <= 2 messages (welcome only) and not loading
  const showQuickActions = messages.length <= 2 && !isLoading;

  // Only render for authenticated users
  if (!user) return null;

  return (
    <>
      {/* ================================================================
          CHAT WINDOW
      ================================================================ */}
      <div
        className={`
          fixed bottom-20 right-3 sm:bottom-24 sm:right-6 z-50
          w-[calc(100vw-1.5rem)] sm:w-[400px] max-w-[400px]
          flex flex-col
          bg-white dark:bg-slate-900
          border border-slate-300 dark:border-slate-700
          rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-black/40
          transition-all duration-300 ease-out
          ${isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
          }
        `}
        style={{ maxHeight: 'min(580px, calc(100dvh - 90px))' }}
        role="dialog"
        aria-label="FinBot AI Financial Assistant"
        aria-modal="false"
      >
        {/* ---- Header ---- */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-t-2xl flex-shrink-0">
          {/* Robot avatar */}
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            <RobotAvatar variant="floating" />
          </div>

          {/* Title + status */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm leading-tight">FinBot</h3>
            <p className="text-indigo-200 text-xs flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLoading ? 'bg-yellow-300 animate-pulse' : 'bg-emerald-300'}`} />
              {isLoading ? 'Thinking...' : 'AI Financial Assistant'}
            </p>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-1">
            {/* Clear history */}
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Clear chat history"
            >
              <FaTrash size={12} />
            </button>

            {/* Close */}
            <button
              onClick={closeChat}
              className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Close chat"
            >
              <FaTimes size={14} />
            </button>
          </div>
        </div>

        {/* ---- Clear Confirm Banner ---- */}
        {showClearConfirm && (
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/30 flex-shrink-0">
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
              Clear all chat history?
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearConfirm}
                className="text-xs px-3 py-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium"
              >
                Clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="text-xs px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ---- Messages Area ---- */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
          style={{ minHeight: 0 }}
        >
          {/* Empty state */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <RobotAvatar variant="floating" className="mb-3 opacity-60" />
              <p className="text-slate-400 dark:text-slate-500 text-sm">
                Ask me anything about your finances!
              </p>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg) => (
            <ChatMessage key={msg._id} message={msg} />
          ))}

          {/* Typing indicator */}
          {isLoading && <TypingIndicator />}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* ---- Error Banner ---- */}
        {error && (
          <div className="flex items-start gap-2 mx-4 mb-2 px-3 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-xl flex-shrink-0">
            <FaExclamationCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 dark:text-red-400 leading-snug">{error}</p>
          </div>
        )}

        {/* ---- Quick Actions ---- */}
        {showQuickActions && (
          <QuickActions onSelect={handleQuickAction} />
        )}

        {/* ---- Input Area ---- */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask FinBot about your finances..."
                rows={1}
                disabled={isLoading}
                className="
                  w-full resize-none px-4 py-2.5 pr-12 text-sm
                  bg-slate-50 dark:bg-slate-800
                  border border-slate-300 dark:border-slate-700
                  rounded-xl
                  text-slate-800 dark:text-slate-100
                  placeholder-slate-400 dark:placeholder-slate-500
                  focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition-colors duration-150
                  leading-relaxed
                "
                style={{
                  maxHeight: '120px',
                  overflowY: inputValue.split('\n').length > 3 ? 'auto' : 'hidden',
                }}
                onInput={(e) => {
                  // Auto-grow textarea
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              className="
                w-10 h-10 flex items-center justify-center flex-shrink-0
                bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                disabled:bg-slate-200 dark:disabled:bg-slate-700
                disabled:cursor-not-allowed
                text-white disabled:text-slate-400 dark:disabled:text-slate-500
                rounded-xl transition-all duration-150
                shadow-md shadow-indigo-600/25 disabled:shadow-none
              "
              title="Send message (Enter)"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FaPaperPlane size={14} />
              )}
            </button>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-600 mt-1.5 text-center">
            Enter to send · Shift+Enter for new line
          </p>
        </div>

        {/* ---- Scroll to Bottom Button ---- */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            className="
              absolute bottom-20 right-4
              w-8 h-8 flex items-center justify-center
              bg-white dark:bg-slate-800
              border border-slate-300 dark:border-slate-700
              text-slate-500 dark:text-slate-400
              hover:text-indigo-600 dark:hover:text-indigo-400
              rounded-full shadow-md
              transition-all duration-150
              animate-fade-in
            "
            title="Scroll to bottom"
          >
            <FaChevronDown size={12} />
          </button>
        )}
      </div>

      {/* ================================================================
          FLOATING ACTION BUTTON (FAB)
      ================================================================ */}
      <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-2">
        {/* Tooltip — shown when closed */}
        {!isOpen && (
          <div className="animate-fade-in">
            <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-medium px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
              Ask FinBot 💬
              {/* Tail */}
              <div className="absolute bottom-[-4px] right-5 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900 dark:border-t-white" />
            </div>
          </div>
        )}

        {/* FAB button */}
        <button
          onClick={toggleChat}
          className={`
            relative w-14 h-14 rounded-full
            flex items-center justify-center
            shadow-xl transition-all duration-300
            focus:outline-none focus:ring-4 focus:ring-indigo-400/30
            ${isOpen
              ? 'bg-slate-700 dark:bg-slate-600 hover:bg-slate-800 dark:hover:bg-slate-500 rotate-0 scale-95'
              : 'bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 hover:scale-105 active:scale-95'
            }
          `}
          aria-label={isOpen ? 'Close FinBot' : 'Open FinBot AI Financial Assistant'}
          title={isOpen ? 'Close FinBot' : 'Open FinBot'}
        >
          {/* Pulse ring — shown when closed */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-20 pointer-events-none" />
          )}

          {isOpen ? (
            <FaTimes size={20} className="text-white" />
          ) : (
            <div className="w-9 h-9 overflow-hidden">
              <RobotAvatar variant="fab" />
            </div>
          )}
        </button>
      </div>
    </>
  );
};

export default FinBot;
