"use client";
import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { removeSpecialCharacters } from "@/helper/removeSpecialCharacters";

function SignIn() {
  const [error, setError] = useState("");
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    dniUser: "",
    password: "",
  });

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
    setError("");
    setLoading(true);

    try {
      const dni = removeSpecialCharacters(formData.dniUser);

      const res = await signIn("credentials", {
        username: dni,
        password: formData.password,
        redirect: false,
      });

      if (res?.ok) {
        router.refresh();
        window.location.assign("/dashboard");
        return;
      }

      setLoading(false);
      setError(res?.error === "CredentialsSignin" ? "Usuario o contrasena incorrectas" : res?.error || "No se pudo iniciar sesion.");
    } catch (error) {
      setLoading(false);
      setError("No se pudo conectar con el servidor de autenticacion.");
    }
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
          className="rounded m-3 px-8 pt-5 mb-4 bg-white h-[250px]"
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
          <button disabled={loading || (formData.dniUser === '') || (formData.password === '')} className="bg-[#6BB2D7] flex justify-center  font-bold shadow appearance-none border rounded w-full py-2 px-3 mb-3 leading-tight focus:outline-none focus:shadow-outline disabled:opacity-50">
            <div>Ingresar</div>
            <div role="status"  className='relative left-4' >
              {loading && <svg width="20" height="20" fill="currentColor" className="mr-2 animate-spin" viewBox="0 0 1792 1792" xmlns="http://www.w3.org/2000/svg">
                <path d="M526 1394q0 53-37.5 90.5t-90.5 37.5q-52 0-90-38t-38-90q0-53 37.5-90.5t90.5-37.5 90.5 37.5 37.5 90.5zm498 206q0 53-37.5 90.5t-90.5 37.5-90.5-37.5-37.5-90.5 37.5-90.5 90.5-37.5 90.5 37.5 37.5 90.5zm-704-704q0 53-37.5 90.5t-90.5 37.5-90.5-37.5-37.5-90.5 37.5-90.5 90.5-37.5 90.5 37.5 37.5 90.5zm1202 498q0 52-38 90t-90 38q-53 0-90.5-37.5t-37.5-90.5 37.5-90.5 90.5-37.5 90.5 37.5 37.5 90.5zm-964-996q0 66-47 113t-113 47-113-47-47-113 47-113 113-47 113 47 47 113zm1170 498q0 53-37.5 90.5t-90.5 37.5-90.5-37.5-37.5-90.5 37.5-90.5 90.5-37.5 90.5 37.5 37.5 90.5zm-640-704q0 80-56 136t-136 56-136-56-56-136 56-136 136-56 136 56 56 136zm530 206q0 93-66 158.5t-158 65.5q-93 0-158.5-65.5t-65.5-158.5q0-92 65.5-158t158.5-66q92 0 158 66t66 158z">
                </path>
              </svg>}
            </div>
          </button>
        </form>
      </div>
    </div>
  );
}

export default SignIn;
