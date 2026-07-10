import React, { createContext, useState, useCallback } from 'react';
import api from '../services/api';

export const TransactionContext = createContext();

export const TransactionProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFiltersState] = useState({
    type: '',
    category: '',
    search: '',
    filterPreset: 'this_month', // Default to current month
    startDate: '',
    endDate: '',
    sortBy: 'date_desc',
  });

  const setFilters = (newFilters) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFiltersState({
      type: '',
      category: '',
      search: '',
      filterPreset: 'this_month',
      startDate: '',
      endDate: '',
      sortBy: 'date_desc',
    });
  };

  const fetchTransactions = useCallback(async (customFilters = null) => {
    setLoading(true);
    try {
      const activeFilters = customFilters || filters;
      const params = {};
      
      if (activeFilters.type) params.type = activeFilters.type;
      if (activeFilters.category) params.category = activeFilters.category;
      if (activeFilters.search) params.search = activeFilters.search;
      if (activeFilters.sortBy) params.sortBy = activeFilters.sortBy;

      if (activeFilters.filterPreset) {
        params.filterPreset = activeFilters.filterPreset;
      } else {
        if (activeFilters.startDate) params.startDate = activeFilters.startDate;
        if (activeFilters.endDate) params.endDate = activeFilters.endDate;
      }

      const res = await api.get('/transactions', { params });
      if (res.data.success) {
        setTransactions(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const addTransaction = async (txData) => {
    try {
      const res = await api.post('/transactions', txData);
      if (res.data.success) {
        // Refresh transactions list
        fetchTransactions();
        return { success: true, data: res.data.data };
      }
    } catch (err) {
      console.error('Error adding transaction:', err);
      return { success: false, error: err.response?.data?.message || 'Error creating transaction.' };
    }
  };

  const editTransaction = async (id, txData) => {
    try {
      const res = await api.put(`/transactions/${id}`, txData);
      if (res.data.success) {
        fetchTransactions();
        return { success: true, data: res.data.data };
      }
    } catch (err) {
      console.error('Error editing transaction:', err);
      return { success: false, error: err.response?.data?.message || 'Error updating transaction.' };
    }
  };

  const removeTransaction = async (id) => {
    try {
      const res = await api.delete(`/transactions/${id}`);
      if (res.data.success) {
        fetchTransactions();
        return { success: true };
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
      return { success: false, error: err.response?.data?.message || 'Error removing transaction.' };
    }
  };

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        loading,
        filters,
        setFilters,
        resetFilters,
        fetchTransactions,
        addTransaction,
        editTransaction,
        removeTransaction,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
