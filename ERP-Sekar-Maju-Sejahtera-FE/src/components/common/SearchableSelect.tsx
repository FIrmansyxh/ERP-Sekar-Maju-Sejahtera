import React, { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
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
  inputId?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  allowCustom?: boolean;
  disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Pilih atau ketik...',
  className = '',
  allowCustom = false,
  inputId,
  onKeyDown,
  disabled = false,
}) => {
  const reactId = useId();
  const portalId = `ss-portal-${inputId || reactId.replace(/:/g, '')}`;

  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);
  const [search, setSearch] = useState('');
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickingRef = useRef(false);

  const syncClosedLabel = () => {
    if (allowCustom) {
      setSearch(value || '');
    } else {
      setSearch(selectedOption ? selectedOption.label : '');
    }
  };

  const updateMenuPos = () => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 180);
    let top = rect.bottom + 4;
    const menuHeight = 260;
    if (top + menuHeight > window.innerHeight && rect.top > menuHeight) {
      top = Math.max(8, rect.top - menuHeight - 4);
    }
    setMenuPos({
      top,
      left: Math.min(rect.left, Math.max(8, window.innerWidth - width - 8)),
      width,
    });
  };

  useEffect(() => {
    if (!isOpen) {
      syncClosedLabel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isOpen, selectedOption?.label, allowCustom]);

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPos();
    const onScrollOrResize = () => updateMenuPos();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, search, options.length]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (wrapperRef.current?.contains(target)) return;
      const portal = document.getElementById(portalId);
      if (portal?.contains(target)) return;
      if (pickingRef.current) return;

      setIsOpen(false);
      if (allowCustom) {
        // Jangan menimpa pilihan yang baru saja diklik dari daftar
        const match = options.find(
          (o) =>
            o.value === search ||
            o.label.toLowerCase() === search.toLowerCase() ||
            o.value.toLowerCase() === search.toLowerCase()
        );
        if (match) {
          onChange(match.value);
        } else if (search.trim()) {
          onChange(search.trim());
        }
      } else {
        syncClosedLabel();
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [allowCustom, search, onChange, portalId, options, selectedOption]);

  const filteredOptions = options.filter(
    (o) =>
      !search.trim() ||
      o.label.toLowerCase().includes(search.toLowerCase()) ||
      o.value.toLowerCase().includes(search.toLowerCase())
  );

  const openMenu = () => {
    if (disabled) return;
    setIsOpen(true);
    // Selalu kosongkan filter saat buka agar semua opsi terlihat
    setSearch('');
    // Pastikan posisi menu terhitung di frame berikutnya (ref sudah siap)
    requestAnimationFrame(() => {
      updateMenuPos();
      inputRef.current?.focus();
    });
  };

  const pickOption = (opt: SelectOption) => {
    pickingRef.current = true;
    onChange(opt.value);
    setSearch(allowCustom ? opt.value : opt.label);
    setIsOpen(false);
    window.setTimeout(() => {
      pickingRef.current = false;
    }, 100);
  };

  const dropdown =
    isOpen && menuPos
      ? createPortal(
          <div
            id={portalId}
            className="fixed z-[9999] bg-white border border-gray-200 rounded-sm shadow-xl max-h-64 overflow-y-auto"
            style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="p-1 text-xs">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-gray-500">
                  {options.length === 0 ? 'Daftar kosong — cek Master Harga Beli' : 'Tidak ada rekomendasi'}
                </div>
              ) : (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={value === opt.value}
                    className={`px-3 py-2 cursor-pointer rounded-sm hover:bg-red-50 hover:text-[#b81d24] transition-colors ${
                      value === opt.value ? 'bg-red-50 text-[#b81d24] font-bold' : 'text-gray-700'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      pickOption(opt);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      pickOption(opt);
                    }}
                  >
                    {opt.label}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div
        className={`flex items-center justify-between w-full bg-white border border-gray-300 rounded-sm px-2.5 py-1.5 focus-within:border-[#b81d24] ${
          disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-text'
        }`}
        onClick={() => {
          if (!isOpen) openMenu();
        }}
      >
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          disabled={disabled}
          autoComplete="off"
          className="w-full bg-transparent text-xs text-gray-900 font-medium focus:outline-none placeholder-gray-400 disabled:cursor-not-allowed"
          placeholder={placeholder}
          value={isOpen ? search : allowCustom ? value || search : selectedOption?.label || search}
          onChange={(e) => {
            const val = e.target.value;
            setSearch(val);
            if (!isOpen) {
              setIsOpen(true);
              requestAnimationFrame(() => updateMenuPos());
            } else {
              updateMenuPos();
            }
            if (allowCustom) {
              onChange(val);
            }
          }}
          onFocus={() => {
            if (!isOpen) openMenu();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              syncClosedLabel();
              return;
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filteredOptions.length === 1) {
                pickOption(filteredOptions[0]);
              } else if (allowCustom && search.trim()) {
                const match = options.find(
                  (o) => o.value.toLowerCase() === search.trim().toLowerCase()
                );
                if (match) pickOption(match);
                else {
                  onChange(search.trim());
                  setIsOpen(false);
                }
              }
            }
            if (onKeyDown) onKeyDown(e);
          }}
        />
        <ChevronDown
          className="w-4 h-4 text-gray-500 ml-2 cursor-pointer hover:text-gray-700 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            if (isOpen) {
              setIsOpen(false);
              syncClosedLabel();
            } else {
              openMenu();
            }
          }}
        />
      </div>
      {dropdown}
    </div>
  );
};
