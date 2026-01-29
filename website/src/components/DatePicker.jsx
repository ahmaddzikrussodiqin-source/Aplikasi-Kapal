import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DatePicker = ({ selected, onChange, placeholderText = "Pilih tanggal", className = "", ...props }) => {
  return (
    <ReactDatePicker
      selected={selected ? new Date(selected) : null}
      onChange={(date) => onChange(date ? date.toISOString().split('T')[0] : '')}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholderText}
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${className}`}
      {...props}
    />
  );
};

export default DatePicker;
