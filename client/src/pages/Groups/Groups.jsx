import React, { useState, useEffect, useContext } from 'react';
import {
  FaPlus, FaUsers, FaTrash, FaArrowLeft,
  FaReceipt, FaUserPlus, FaTimes, FaMoneyBillWave,
  FaCrown, FaCheck,
} from 'react-icons/fa';
import { GroupContext } from '../../context/GroupContext';
import { AuthContext } from '../../context/AuthContext';
import { formatMoney } from '../../utils/formatMoney';
import ReceiptScanner from '../../components/receipt/ReceiptScanner';

/* ─── constants ──────────────────────────────────────────────────────────── */
const GROUP_TYPES = [
  { value: 'trip',      label: '✈️  Trip' },
  { value: 'roommates', label: '🏠  Roommates' },
  { value: 'event',     label: '🎉  Event' },
  { value: 'other',     label: '👥  Other' },
];
const TYPE_ICONS = { trip:'✈️', roommates:'🏠', event:'🎉', other:'👥' };
const EXPENSE_CATS = ['Food','Transport','Accommodation','Entertainment','Shopping','Bills','Healthcare','Travel','Others'];

/* ─── small reusables ────────────────────────────────────────────────────── */
const inp = 'w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm outline-none transition';
const lbl = 'block text-xs text-slate-400 mb-1';
const btnP = 'flex-1 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-50';
const btnS = 'flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition';

const Modal = ({ title, onClose, children, maxW = 'max-w-md' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4 overflow-y-auto">
    <div className={`w-full ${maxW} my-4 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-300 dark:border-slate-800 animate-fade-in`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-300 dark:border-slate-800">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{title}</h3>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"><FaTimes size={14}/></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);
