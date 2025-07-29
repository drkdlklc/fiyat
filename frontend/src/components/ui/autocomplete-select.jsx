import React, { useState, useRef, useEffect } from 'react';
import { Input } from './input';
import { Button } from './button';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

const AutocompleteSelect = ({ 
  value, 
  onValueChange, 
  options = [], 
  placeholder = "Select an option...",
  displayValue = (option) => option.name,
  searchValue = (option) => option.name.toLowerCase(),
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option => 
    searchValue(option).includes(searchTerm.toLowerCase())
  );

  // Find selected option
  const selectedOption = options.find(option => 
    option.id?.toString() === value?.toString()
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        } else if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle option selection
  const handleOptionSelect = (option) => {
    onValueChange(option.id.toString());
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle clear selection
  const handleClear = (e) => {
    e.stopPropagation();
    onValueChange('');
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  // Handle input focus
  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setHighlightedIndex(-1);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  // Reset highlight when filtered options change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={searchTerm || (selectedOption ? displayValue(selectedOption) : '')}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-16"
        />
        
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selectedOption && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={disabled}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X size={12} />
            </Button>
          )}
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className="h-6 w-6 p-0 hover:bg-gray-100"
          >
            {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              No options found
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={option.id}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                  index === highlightedIndex ? 'bg-blue-50' : ''
                } ${
                  option.id?.toString() === value?.toString() ? 'bg-blue-100 font-medium' : ''
                }`}
                onClick={() => handleOptionSelect(option)}
              >
                {displayValue(option)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteSelect;