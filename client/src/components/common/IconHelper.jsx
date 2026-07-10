import React from 'react';
import * as FaIcons from 'react-icons/fa';

const IconHelper = ({ name, className = '' }) => {
  const IconComponent = FaIcons[name];
  if (!IconComponent) {
    // Fallback icon if not found
    return <FaIcons.FaCoins className={className} />;
  }
  return <IconComponent className={className} />;
};

export default IconHelper;
