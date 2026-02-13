import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DatePicker = ({ selected, onChange, placeholderText = "Pilih tanggal", className = "", ...props }) => {
  // Helper function to safely parse date string to Date object without timezone issues
  const parseDateString = (dateStr) => {
    if (!dateStr || dateStr === '') return null;
    try {
      // Handle YYYY-MM-DD format (standard HTML date input format)
      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0);
      }
      // Handle DD/MM/YYYY format
      if (typeof dateStr === 'string' && dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0);
      }
      // Handle DD-MM-YYYY format
      if (typeof dateStr === 'string' && dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const [day, month, year] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0);
      }
      // Fallback: try to parse as-is
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  // Helper function to format date as DD/MM/YYYY without timezone issues
  const formatDateAsString = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  };

  return (
    <ReactDatePicker
      selected={parseDateString(selected)}
      onChange={(date) => onChange(formatDateAsString(date))}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholderText}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${className}`}
      {...props}
    />
  );
};

export default DatePicker;
