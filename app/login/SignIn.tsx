"use client";
import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

function SignIn() {
  const [error, setError] = useState("");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>();
  const [formData, setFormData] = useState({
    dniUser: "",
    password: "",
  });

  useEffect(()=>{
    // Get Company Id from URL QueryParams
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const companyId = urlParams.get('company_id');
    setCompanyId(companyId);
  }, [])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (event: { preventDefault: () => void; }) => {
    event.preventDefault();

    if (!companyId) {
      setError('No es posible determinar la compañia, debe especificar el companyId en la url');
      return;
    }

    const res = await signIn("credentials", {
      username: formData.dniUser,
      password: formData.password,
      company_id: companyId,
      redirect: false,
    });

    if (res?.error) setError(res.error);

    if (res?.ok) return router.push("/dashboard");
  };

  return (
    <div className="flex justify-center items-center h-screen bg-cover bg-right bg-[url('../public/fondo_engranajes.jpg')]">
      <div className="w-full max-w-xs overflow-hidden h-auto bg-[#6BB2D7] rounded-lg">
        <div className="mx-auto flex justify-center items-center mt-10 font-bold">
          Welcome to
        </div>
        <div className="mx-auto flex justify-center items-center mb-[70px]">
          <Image src="/logo.png" width="235" height="64" alt="Logo" />
        </div>

        {error &&
          <div className="p-4 mb-0 mx-3 text-sm text-blue-800 rounded-lg bg-blue-50" role="alert">
            <span className="font-medium">Importante</span> {error}
          </div>
        }

        <form
          onSubmit={handleSubmit}
          className="rounded m-3 px-8 pt-5 mb-4 bg-white"
        >
          <div className="mb-4">
            <label
              htmlFor="dniUser"
              className="block text-gray-700 text-sm font-bold mb-1"
            >
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
            <label
              htmlFor="password"
              className="block text-gray-700 text-sm font-bold mb-1"
              id="password"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                className="bg-white shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={(e) => handleChange(e)}
                placeholder="******************"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center h-9">
                <button type="button" onClick={togglePasswordVisibility}>
                  <FontAwesomeIcon
                    icon={showPassword ? faEye : faEyeSlash}
                    size="sm"
                    className="text-gray-500"
                  />
                </button>
              </div>
            </div>
          </div>
          <button className="bg-[#6BB2D7] font-bold shadow appearance-none border rounded w-full py-2 px-3 mb-3 leading-tight focus:outline-none focus:shadow-outline">
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}

export default SignIn;
