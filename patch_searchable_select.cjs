const fs = require('fs');

const code = `import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Pilih atau ketik...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync search input with selected label when closed
  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    if (!isOpen) {
      setSearch(selectedOption ? selectedOption.label : '');
    }
  }, [value, isOpen, selectedOption]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset search to selected value if click outside without selecting
        setSearch(selectedOption ? selectedOption.label : '');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase()) || 
    o.value.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={\`relative \${className}\`} ref={wrapperRef}>
      <div 
        className={\`flex items-center justify-between w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 cursor-text focus-within:border-[#b81d24]\`}
        onClick={() => { 
          if (!isOpen) {
            setIsOpen(true);
            setSearch(''); // Clear text to show all options and allow typing fresh
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
      >
        <input
          ref={inputRef}
          type="text"
          className="w-full bg-transparent text-xs text-gray-900 font-medium focus:outline-none placeholder-gray-400"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true); // Open dropdown as user types
          }}
          onFocus={() => {
            if (!isOpen) {
              setIsOpen(true);
              setSearch('');
            }
          }}
        />
        <ChevronDown 
          className="w-4 h-4 text-gray-500 ml-2 cursor-pointer hover:text-gray-700" 
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
            if (!isOpen) {
              setSearch('');
              setTimeout(() => inputRef.current?.focus(), 50);
            } else {
              setSearch(selectedOption ? selectedOption.label : '');
            }
          }}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-sm shadow-xl max-h-64 overflow-y-auto">
          <div className="p-1 text-xs">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-gray-500">Tidak ditemukan</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={\`px-3 py-2 cursor-pointer rounded-sm hover:bg-red-50 hover:text-[#b81d24] transition-colors \${value === opt.value ? 'bg-red-50 text-[#b81d24] font-bold' : 'text-gray-700'}\`}
                  onClick={() => {
                    onChange(opt.value);
                    setSearch(opt.label);
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
`;

fs.writeFileSync('src/components/common/SearchableSelect.tsx', code);
console.log('SearchableSelect component updated to ComboBox style (type-first).');
