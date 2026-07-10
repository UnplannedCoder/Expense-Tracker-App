import React, { createContext, useState, useCallback } from 'react';
import api from '../services/api';

export const GroupContext = createContext();

export const GroupProvider = ({ children }) => {
  const [groups, setGroups]           = useState([]);
  const [activeGroup, setActiveGroup] = useState(null); // currently open group detail
  const [loading, setLoading]         = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── list ────────────────────────────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/groups');
      if (res.data.success) setGroups(res.data.data);
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── detail ───────────────────────────────────────────────────────────────────
  const fetchGroupById = useCallback(async (id) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/groups/${id}`);
      if (res.data.success) {
        setActiveGroup(res.data.data);
        return { success: true, data: res.data.data };
      }
    } catch (err) {
      console.error('Error fetching group detail:', err);
      return { success: false, error: err.response?.data?.message || 'Failed to load group.' };
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── create ───────────────────────────────────────────────────────────────────
  const createGroup = async (groupData) => {
    try {
      const res = await api.post('/groups', groupData);
      if (res.data.success) {
        await fetchGroups();
        return { success: true, data: res.data.data };
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to create group.' };
    }
  };

  // ── update ───────────────────────────────────────────────────────────────────
  const updateGroup = async (id, groupData) => {
    try {
      const res = await api.put(`/groups/${id}`, groupData);
      if (res.data.success) {
        await fetchGroups();
        if (activeGroup?._id === id) setActiveGroup(res.data.data);
        return { success: true, data: res.data.data };
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to update group.' };
    }
  };

  // ── delete ───────────────────────────────────────────────────────────────────
  const deleteGroup = async (id) => {
    try {
      const res = await api.delete(`/groups/${id}`);
      if (res.data.success) {
        await fetchGroups();
        if (activeGroup?._id === id) setActiveGroup(null);
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to delete group.' };
    }
  };

  // ── members ──────────────────────────────────────────────────────────────────
  const addMember = async (groupId, memberData) => {
    try {
      const res = await api.post(`/groups/${groupId}/members`, memberData);
      if (res.data.success) {
        await fetchGroupById(groupId);
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to add member.' };
    }
  };

  const removeMember = async (groupId, memberId) => {
    try {
      const res = await api.delete(`/groups/${groupId}/members/${memberId}`);
      if (res.data.success) {
        await fetchGroupById(groupId);
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to remove member.' };
    }
  };

  const settleMember = async (groupId, memberId) => {
    try {
      const res = await api.put(`/groups/${groupId}/members/${memberId}/settle`);
      if (res.data.success) {
        await fetchGroupById(groupId);
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to settle member.' };
    }
  };

  // ── expenses ─────────────────────────────────────────────────────────────────
  const addExpense = async (groupId, expenseData) => {
    try {
      const res = await api.post(`/groups/${groupId}/expenses`, expenseData);
      if (res.data.success) {
        setActiveGroup(res.data.data);
        await fetchGroups(); // refresh totalExpense on the list
        return { success: true, data: res.data.data };
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to add expense.' };
    }
  };

  const deleteExpense = async (groupId, expenseId) => {
    try {
      const res = await api.delete(`/groups/${groupId}/expenses/${expenseId}`);
      if (res.data.success) {
        setActiveGroup(res.data.data);
        await fetchGroups();
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.message || 'Failed to delete expense.' };
    }
  };

  return (
    <GroupContext.Provider
      value={{
        groups,
        activeGroup,
        loading,
        detailLoading,
        fetchGroups,
        fetchGroupById,
        createGroup,
        updateGroup,
        deleteGroup,
        addMember,
        removeMember,
        settleMember,
        addExpense,
        deleteExpense,
        setActiveGroup,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
};
