import React, { createContext, useState, useCallback } from 'react';
import api from '../services/api';

export const CategoryContext = createContext();

export const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addCategory = async (catData) => {
    try {
      const res = await api.post('/categories', catData);
      if (res.data.success) {
        fetchCategories();
        return { success: true, data: res.data.data };
      }
    } catch (err) {
      console.error('Error adding category:', err);
      return { success: false, error: err.response?.data?.message || 'Error creating category.' };
    }
  };

  const editCategory = async (id, catData) => {
    try {
      const res = await api.put(`/categories/${id}`, catData);
      if (res.data.success) {
        fetchCategories();
        return { success: true, data: res.data.data };
      }
    } catch (err) {
      console.error('Error editing category:', err);
      return { success: false, error: err.response?.data?.message || 'Error updating category.' };
    }
  };

  const removeCategory = async (id) => {
    try {
      const res = await api.delete(`/categories/${id}`);
      if (res.data.success) {
        fetchCategories();
        return { success: true };
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      return { success: false, error: err.response?.data?.message || 'Error removing category.' };
    }
  };

  return (
    <CategoryContext.Provider
      value={{
        categories,
        loading,
        fetchCategories,
        addCategory,
        editCategory,
        removeCategory,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};
