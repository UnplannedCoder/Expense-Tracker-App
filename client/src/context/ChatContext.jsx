import React, { createContext, useState, useCallback, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from './AuthContext';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useContext(AuthContext);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [error, setError] = useState(null);
  // Tracks whether the welcome message has been shown this session
  const [hasGreeted, setHasGreeted] = useState(false);

  /**
   * Opens the chat window.
   * On first open, load history from the server.
   * If there is no history, inject the greeting message.
   */
  const openChat = useCallback(async () => {
    setIsOpen(true);
    if (!isHistoryLoaded && user) {
      await loadHistory();
    }
  }, [isHistoryLoaded, user]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    if (!isOpen) {
      openChat();
    } else {
      closeChat();
    }
  }, [isOpen, openChat, closeChat]);

  /**
   * Fetches saved conversation history from the backend.
   * Adds a greeting if no prior messages exist.
   */
  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get('/chat/history');
      if (res.data.success) {
        const history = res.data.data;
        if (history.length === 0 && !hasGreeted) {
          // First-time user — show welcome greeting
          setMessages([
            {
              _id: 'welcome',
              role: 'model',
              message:
                "Hello! I'm **FinBot** 👋, your personal AI Financial Assistant.\n\nI can help you with:\n- 📊 Analyzing your spending patterns\n- 💡 Budget planning & saving tips\n- 📈 Monthly financial summaries\n- 🎯 Personalized money-saving advice\n\nWhat would you like to know about your finances today?",
              createdAt: new Date().toISOString(),
              isWelcome: true,
            },
          ]);
          setHasGreeted(true);
        } else {
          setMessages(history);
        }
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
      // Still show greeting even if history load fails
      if (!hasGreeted) {
        setMessages([
          {
            _id: 'welcome',
            role: 'model',
            message: "Hello! I'm **FinBot** 👋, your personal AI Financial Assistant. How can I help you today?",
            createdAt: new Date().toISOString(),
            isWelcome: true,
          },
        ]);
        setHasGreeted(true);
      }
    } finally {
      setIsHistoryLoaded(true);
    }
  }, [hasGreeted]);

  /**
   * Sends a user message and appends the AI response.
   * Optimistically adds the user message to the UI immediately.
   */
  const sendMessage = useCallback(
    async (text) => {
      if (!text || !text.trim() || isLoading) return;

      const trimmed = text.trim();
      setError(null);

      // Optimistic user message
      const tempUserMsg = {
        _id: `temp-user-${Date.now()}`,
        role: 'user',
        message: trimmed,
        createdAt: new Date().toISOString(),
        isTemp: true,
      };

      setMessages((prev) => [...prev, tempUserMsg]);
      setIsLoading(true);

      try {
        const res = await api.post('/chat/message', { message: trimmed });
        if (res.data.success) {
          // Replace temp message with confirmed + add AI response
          setMessages((prev) => [
            ...prev.filter((m) => m._id !== tempUserMsg._id),
            { ...tempUserMsg, _id: `user-${Date.now()}`, isTemp: false },
            {
              _id: `model-${Date.now()}`,
              role: 'model',
              message: res.data.data.message,
              createdAt: res.data.data.timestamp,
            },
          ]);
        }
      } catch (err) {
        const errMsg =
          err.response?.data?.message ||
          'Something went wrong. Please check your connection and try again.';
        setError(errMsg);
        // Remove the optimistic message on error
        setMessages((prev) => prev.filter((m) => m._id !== tempUserMsg._id));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  /**
   * Clears chat history both on the server and in local state.
   */
  const clearHistory = useCallback(async () => {
    try {
      await api.delete('/chat/history');
      setMessages([
        {
          _id: 'welcome-after-clear',
          role: 'model',
          message: "Chat cleared! I'm ready to help. What would you like to know about your finances?",
          createdAt: new Date().toISOString(),
          isWelcome: true,
        },
      ]);
      setError(null);
    } catch (err) {
      console.error('Failed to clear chat history:', err);
    }
  }, []);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        messages,
        isLoading,
        error,
        openChat,
        closeChat,
        toggleChat,
        sendMessage,
        clearHistory,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
