import React, { useState } from "react";

function NewCompanyForm({ handleChange, label, value, name }) {
  const [inputValue, setInputValue] = useState(value || ""); 

  const handleInputChange = ({ target: { value } }) => {
    setInputValue(value);
    handleChange(value, name);
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    setInputValue(""); 
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4 mb-3">
      <div className="flex flex-col">
        <label
          htmlFor={label}
          className="text-gray-700 text-sm font-bold whitespace-nowrap mb-1"
        >
          {label}
        </label>
        <input
          type="text"
          id={label}
          name={name}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={label}
          className="bg-white shadow appearance-none border rounded py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
    </form>
  );
}

export default NewCompanyForm;
