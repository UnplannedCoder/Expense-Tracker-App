/**
 * IconHelper
 * Resolves a react-icons/fa icon by string name without importing the entire
 * library. Only icons that are actually used across the app are listed here.
 * Add new entries as needed — this keeps the bundle lean.
 */
import React from 'react';
import {
  FaArrowUp,
  FaArrowDown,
  FaCoins,
  FaWallet,
  FaShoppingCart,
  FaUtensils,
  FaCar,
  FaHome,
  FaHeartbeat,
  FaPlane,
  FaGraduationCap,
  FaBolt,
  FaFilm,
  FaGift,
  FaMoneyBillWave,
  FaPiggyBank,
  FaChartLine,
  FaQuestionCircle,
} from 'react-icons/fa';

const ICON_MAP = {
  FaArrowUp,
  FaArrowDown,
  FaCoins,
  FaWallet,
  FaShoppingCart,
  FaUtensils,
  FaCar,
  FaHome,
  FaHeartbeat,
  FaPlane,
  FaGraduationCap,
  FaBolt,
  FaFilm,
  FaGift,
  FaMoneyBillWave,
  FaPiggyBank,
  FaChartLine,
  FaQuestionCircle,
};

const IconHelper = ({ name, className = '', size }) => {
  const IconComponent = ICON_MAP[name] ?? FaQuestionCircle;
  return <IconComponent className={className} size={size} />;
};

export default IconHelper;
