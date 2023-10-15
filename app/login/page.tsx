"use client";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from 'next/image'

function SignIn() {
  const [error, setError] = useState("");
  const router = useRouter();

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const res = await signIn("credentials", {
      username: formData.dniUser,
      password: formData.password,
      redirect: false,
    });
 
    if (res?.error) setError(res.error as string);

    if (res?.ok) return router.push("/dashboard");
  };

  return (
    <div className="flex justify-center items-center h-screen bg-cover bg-right bg-[url('../public/fondo_engranajes.jpg')]">
      <div className="w-full max-w-xs overflow-hidden h-auto bg-[#6BB2D7] rounded-lg "> 
        <div className="mx-auto flex justify-center items-center mt-10 font-bold" >Welcome to</div>
        <div className="mx-auto  flex justify-center items-center " >
            <div>
              <Image src='/logo.png' width="235"  height= '64'  alt='Logo'/>
            </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded m-3 px-8 pt-5 mb-4 bg-white mt-[74px]"
        >
          <div className="mb-4">
              <label htmlFor="dniUser" className="block text-gray-700 text-sm font-bold mb-1">
                Número de cédula 
            </label>
              <input 
                type="text"
                name="dniUser"
                value={formData.dniUser}
                onChange={(e) => handleChange(e)}
                placeholder="Ingrese su número" 
                className="bg-white shadow appearance-none border rounded w-full py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline" 
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password"  className="block text-gray-700 text-sm font-bold mb-1" id="password">
                Contraseña
              </label> 
            <input 
              className="bg-white shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" 
              type="password" 
              name='password'
              value={formData.password}
              onChange={(e) => handleChange(e)}
              placeholder="******************" />
            </div>

          <button className="bg-[#6BB2D7] font-bold shadow appearance-none border rounded w-full py-2 px-3 mb-3 leading-tight focus:outline-none focus:shadow-outline" >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}

export default SignIn;