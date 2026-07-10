import React from 'react';
import RobotAvatar from './RobotAvatar';

/**
 * TypingIndicator
 * Animated three-dot "FinBot is thinking" bubble.
 * Shown in the message list while waiting for the AI response.
 */
const TypingIndicator = () => {
  return (
    <div className="flex items-end gap-2 animate-fade-in">
      {/* Bot avatar */}
      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center flex-shrink-0 mb-1 shadow-sm">
        <RobotAvatar variant="small" />
      </div>

      {/* Bubble */}
      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <span className="text-xs text-slate-400 dark:text-slate-500 mr-1 font-medium">FinBot is thinking</span>
        {/* Bouncing dots */}
        <span
          className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 inline-block"
          style={{ animation: 'typingBounce 1.2s ease-in-out infinite', animationDelay: '0ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 inline-block"
          style={{ animation: 'typingBounce 1.2s ease-in-out infinite', animationDelay: '200ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 inline-block"
          style={{ animation: 'typingBounce 1.2s ease-in-out infinite', animationDelay: '400ms' }}
        />
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default TypingIndicator;
