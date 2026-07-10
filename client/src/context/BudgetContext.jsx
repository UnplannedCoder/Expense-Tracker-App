import React, { createContext, useState, useCallback } from 'react';
import api from '../services/api';

export const BudgetContext = createContext();

export const BudgetProvider = ({ children }) => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBudgets = useCallback(async (month, year) => {
    setLoading(true);
    try {
      const params = {};
      if (month) params.month = month;
      if (year) params.year = year;

      const res = await api.get('/budgets', { params });
      if (res.data.success) {
        setBudgets(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching budgets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addBudget = async (budgetData) => {
    try {
      const res = await api.post('/budgets', budgetData);
      if (res.data.success) {
        // Fetch using the budget's month and year
        fetchBudgets(budgetData.month, budgetData.year);
        return { success: true, data: res.data.data };
      }
    } catch (err) {
      console.error('Error adding budget:', err);
      return { success: false, error: err.response?.data?.message || 'Error creating budget.' };
    }
  };

  const editBudget = async (id, limit, month, year) => {
    try {
      const res = await api.put(`/budgets/${id}`, { limit });
      if (res.data.success) {
        fetchBudgets(month, year);
        return { success: true, data: res.data.data };
      }
    } catch (err) {
      console.error('Error editing budget:', err);
      return { success: false, error: err.response?.data?.message || 'Error updating budget limit.' };
    }
  };

  const removeBudget = async (id, month, year) => {
    try {
      const res = await api.delete(`/budgets/${id}`);
      if (res.data.success) {
        fetchBudgets(month, year);
        return { success: true };
      }
    } catch (err) {
      console.error('Error deleting budget:', err);
      return { success: false, error: err.response?.data?.message || 'Error removing budget.' };
    }
  };

  return (
    <BudgetContext.Provider
      value={{
        budgets,
        loading,
        fetchBudgets,
        addBudget,
        editBudget,
        removeBudget,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
};
