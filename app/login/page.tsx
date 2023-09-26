'use client';
import { useState } from 'react';
import Button from "@/ui/button/button";

export default function Login() {
  const [formData, setFormData] = useState({
    dniUser: '',
    password: '',
  });

  const handleChange = (e: any): void => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = ()  => { };

  const disabledButton = formData.dniUser !== '' && formData.password !== ''

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-full max-w-xs overflow-hidden bg-white rounded-lg "> 
        <form className="rounded px-8 pt-5 mb-4 i" >
          <div className="mb-4">
            <label htmlFor="dniUser" className="block text-gray-700 text-sm font-bold mb-2">
              Número de cédula 
            </label>
            <input 
              type="text"
              name="dniUser"
              value={formData.dniUser}
              onChange={(e) => handleChange(e)}
              placeholder="Ingrese su número de cedula" 
              className="bg-white shadow appearance-none border rounded w-full py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline" 
            />
          </div>
          <div className="mb-6">
            <label htmlFor="password"  className="block text-gray-700 text-sm font-bold mb-2" id="password">
              Contraseña
            </label> 
          <input 
            className="bg-white shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" 
            type="password" 
            name='password'
            value={formData.password}
            onChange={(e) => handleChange(e)}
            placeholder="******************" />
            {/* <p className="text-red-500 text-xs italic">Please choose a password.</p> */}
          </div>
        </form>
        <div className="rounded px-8 mb-4 i">
            <Button  
            nameButton={'Ingresar'}
            onClickButton={() => handleSubmit()}
            disabled={!disabledButton}
            styleButton={'bg-purple-300  p-3 w-full transform hover:scale-105 transition duration-200 rounded-full'}
            />
          </div>
      </div>
    </div>
  );
}
