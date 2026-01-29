import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DatePicker = ({ selected, onChange, placeholderText = "Pilih tanggal", className = "", ...props }) => {
  // Helper function to safely parse date string to Date object without timezone issues
  const parseDateString = (dateStr) => {
    if (!dateStr) return null;
    try {
      // Handle YYYY-MM-DD format specifically to avoid timezone issues
      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day, 12, 0, 0); // Set to noon to avoid midnight timezone shifts
      }
      return new Date(dateStr);
    } catch {
      return null;
    }
  };

  return (
    <ReactDatePicker
      selected={parseDateString(selected)}
      onChange={(date) => onChange(date ? date.toISOString().split('T')[0] : '')}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholderText}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${className}`}
      {...props}
    />
  );
};

export default DatePicker;
