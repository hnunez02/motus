import { useState, useEffect } from 'react';

const MODES = {
  none:         '',
  protanopia:   'grayscale(0.6) sepia(0.4) saturate(0.8) hue-rotate(320deg)',
  deuteranopia: 'grayscale(0.5) sepia(0.3) saturate(0.9) hue-rotate(90deg)',
  tritanopia:   'grayscale(0.3) sepia(0.5) saturate(0.7) hue-rotate(180deg)',
};

export function useColorblindMode() {
  const [mode, setMode] = useState(
    () => localStorage.getItem('colorblindMode') || 'none'
  );

  useEffect(() => {
    const filter = MODES[mode] || '';
    document.documentElement.style.filter = filter;
    localStorage.setItem('colorblindMode', mode);
  }, [mode]);

  return { mode, setMode, MODES };
}
