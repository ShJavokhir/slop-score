'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface TubeNavItem {
  id: string;
  label: string;
}

interface TubeNavProps {
  items: TubeNavItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function TubeNav({ items, activeId, onChange }: TubeNavProps) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    const activeElement = itemRefs.current[activeId];
    const navElement = navRef.current;

    if (activeElement && navElement) {
      const navRect = navElement.getBoundingClientRect();
      const activeRect = activeElement.getBoundingClientRect();

      setIndicatorStyle({
        left: activeRect.left - navRect.left,
        width: activeRect.width,
      });
    }
  }, [activeId]);

  return (
    <div className="relative inline-flex items-center bg-gray-100 rounded-full p-1" ref={navRef}>
      {/* Animated background indicator */}
      <div
        className="absolute bg-white rounded-full transition-all duration-300 ease-out shadow-sm"
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
          height: 'calc(100% - 8px)',
          top: '4px',
        }}
      />

      {/* Tab buttons */}
      {items.map((item) => (
        <button
          key={item.id}
          ref={(el) => {
            itemRefs.current[item.id] = el;
          }}
          onClick={() => onChange(item.id)}
          className={`
            relative z-10 px-6 py-2 text-sm font-medium transition-colors duration-200
            ${
              activeId === item.id
                ? 'text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }
          `}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
