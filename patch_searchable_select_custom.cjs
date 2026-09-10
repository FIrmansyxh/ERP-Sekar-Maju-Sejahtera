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
  allowCustom?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Pilih atau ketik...',
  className = '',
  allowCustom = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // When allowCustom is true, search matches the value directly.
  // When false, search tracks the label of the selected option.
  const selectedOption = options.find((o) => o.value === value);
  const [search, setSearch] = useState('');

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      if (allowCustom) {
        setSearch(value);
      } else {
        setSearch(selectedOption ? selectedOption.label : '');
      }
    }
  }, [value, isOpen, selectedOption, allowCustom]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (allowCustom) {
          onChange(search); // Commit the custom search value if clicked outside
        } else {
          setSearch(selectedOption ? selectedOption.label : '');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption, allowCustom, search, onChange]);

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
            if (!allowCustom) {
              setSearch(''); // Clear text to show all options
            }
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
            const val = e.target.value;
            setSearch(val);
            setIsOpen(true);
            if (allowCustom) {
              onChange(val); // Immediately update value
            }
          }}
          onFocus={() => {
            if (!isOpen) {
              setIsOpen(true);
              if (!allowCustom) {
                setSearch('');
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && allowCustom) {
              e.preventDefault();
              setIsOpen(false);
              onChange(search);
            }
          }}
        />
        <ChevronDown 
          className="w-4 h-4 text-gray-500 ml-2 cursor-pointer hover:text-gray-700" 
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
            if (!isOpen) {
              if (!allowCustom) setSearch('');
              setTimeout(() => inputRef.current?.focus(), 50);
            } else {
              if (!allowCustom) setSearch(selectedOption ? selectedOption.label : '');
            }
          }}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-sm shadow-xl max-h-64 overflow-y-auto">
          <div className="p-1 text-xs">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-gray-500">Tidak ada rekomendasi</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={\`px-3 py-2 cursor-pointer rounded-sm hover:bg-red-50 hover:text-[#b81d24] transition-colors \${value === opt.value ? 'bg-red-50 text-[#b81d24] font-bold' : 'text-gray-700'}\`}
                  onClick={() => {
                    onChange(opt.value);
                    if (!allowCustom) setSearch(opt.label);
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
`
fs.writeFileSync('src/components/common/SearchableSelect.tsx', code);
console.log('Patched SearchableSelect');
