"use client";

import { useState, useRef, useEffect } from 'react';

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  error?: string;
}

export default function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select or type...",
  className = "",
  error
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Filter options based on input value
    const filtered = options.filter(option =>
      option.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [value, options]);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleOptionClick = (option: string) => {
    onChange(option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 text-gray-900 ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
        } ${className}`}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredOptions.map((option, index) => (
            <div
              key={index}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-gray-900"
              onClick={() => handleOptionClick(option)}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
