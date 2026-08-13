"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { type ChronosUsers } from "@/types/chronosUsers";

import { Spinner } from '@/ui/spinner';

export function ChronosUsersForm({
  user,
  companies,
  fixedCompanyId,
  returnPath = '/admin/users',
  companyScope = false,
  lockAdministratorIdentity = false,
}: {
  user?: ChronosUsers
  companies?: any
  fixedCompanyId?: string
  returnPath?: string
  companyScope?: boolean
  lockAdministratorIdentity?: boolean
}) {

  const router = useRouter();

  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const [formData, setFormData] = useState<any>({
    id_company: fixedCompanyId?.trim() || user?.id_company?.trim() || '',
    code: user?.code?.trim() || '',
    password: user?.password?.trim() || '',
    name: user?.name?.trim() || '',
    rol: user?.rol?.trim() || '',
    email: user?.email?.trim() || '',
    x_studio_new_material: Boolean(user?.x_studio_new_material),
    original_code: user?.code?.trim() || '',
    original_id_company: user?.id_company?.trim() || '',
  });

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const getPayload = () => ({
    ...formData,
    id_company: formData.id_company?.trim() || '',
    code: formData.code?.trim() || '',
    password: formData.password?.trim() || '',
    name: formData.name?.trim() || '',
    rol: formData.rol?.trim() || '',
    email: formData.email?.trim() || '',
  });
  const isFormInvalid = !formData.name?.trim()
    || !formData.rol?.trim()
    || !formData.email?.trim()
    || !formData.id_company?.trim()
    || !formData.password?.trim()
    || !formData.code?.trim();

  const getErrorMessage = async (response: Response, fallback: string) => {
    try {
      const data = await response.json();
      return data?.message || fallback;
    } catch {
      return fallback;
    }
  };

  const requestHeaders = {
    "Content-Type": "application/json",
    ...(companyScope ? { "x-chronos-company-scope": "1" } : {}),
  };

  const createUser = async () => {
    const response = await fetch("/api/users", {
      method: 'POST',
      credentials: 'same-origin',
      headers: requestHeaders,
      body: JSON.stringify(getPayload())
    });

    if (!response.ok) {
      const message = await getErrorMessage(response, "Ha ocurrido un error al intentar crear el usuario");
      setFormError(message);
      return;
    }

    navigateOnSuccess()
  };

  const updateUser = async () => {
    const response = await fetch("/api/users", {
      method: 'PUT',
      credentials: 'same-origin',
      headers: requestHeaders,
      body: JSON.stringify(getPayload())
    });

    if (!response.ok) {
      const message = await getErrorMessage(response, "Ha ocurrido un error al intentar editar el usuario");
      setFormError(message);
      return;
    }

    navigateOnSuccess()
  };

  const deleteUser = async () => {
    if (!user) return;
    const shouldDelete = window.confirm(`Eliminar usuario ${formData.name || formData.code}?`);
    if (!shouldDelete) return;

    setLoading(true);
    setFormError(null);

    try {
      const response = await fetch("/api/users", {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: requestHeaders,
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const message = await getErrorMessage(response, "Ha ocurrido un error al intentar eliminar el usuario");
        setFormError(message);
        return;
      }

      navigateOnSuccess();
    } catch (error) {
      console.error("Error deleting user:", error);
      setFormError("Ha ocurrido un error inesperado al eliminar el usuario");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setFormError(null);

    try {
      if (!user) {
        await createUser()
      } else {
        await updateUser()
      }
    } catch (error) {
      console.error("Error saving user:", error);
      setFormError("Ha ocurrido un error inesperado al guardar el usuario");
    } finally {
      setLoading(false);
    }
  };

  const navigateOnSuccess = () => {
    router.push(returnPath);
    router.refresh();
  }


  return (
    <form onSubmit={handleSubmit} className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[60vh] w-full">

      {formError &&
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-5" role="alert">
          <p className="font-bold">Error</p>
          <p>{formError}</p>
        </div>
      }

      <div className="mb-4">
        <label htmlFor="code" className="text-xs block text-gray-700 font-bold mb-2">
         Número de identificación
        </label>
        <input
          type="text"
          id="code"
          name="code"
          value={formData?.code || ''}
          onChange={handleChange}
          disabled={lockAdministratorIdentity}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="name" className="text-xs block text-gray-700 font-bold mb-2">
          Nombre
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData?.name || ''}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="email" className="text-xs block text-gray-700 font-bold mb-2">
          Email
        </label>
        <input
          type="text"
          id="email"
          name="email"
          value={formData?.email || ''}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="password" className="text-xs block text-gray-700 font-bold mb-2">
          Password
        </label>
        <input
          type="text"
          id="password"
          name="password"
          value={formData?.password || ''}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>
      <div className="mb-4">
        <label htmlFor="user_default" className="text-xs block text-gray-700 font-bold mb-2">
          Compañia
        </label>
        <select 
          name="id_company"
          value={formData?.id_company || ''}
          onChange={handleChange}
          disabled={Boolean(fixedCompanyId)}
          className="w-full bg-white shadow border rounded py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline">
            <option>{"Seleccionar compañia"}</option>
            {companies?.map((item:any, index: number)=> (
                <option value={item.id_company.trim()} key={index}>{item.name}</option>
              ))}
          </select>
      </div>

      <div className="mb-4">
        <label htmlFor="rol" className="text-xs block text-gray-700 font-bold mb-2">
          Rol
        </label>
        <select
          name='rol'
          onChange={handleChange}
          value={formData?.rol || ''}
          disabled={lockAdministratorIdentity}
          className="w-full bg-white shadow border rounded py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline">
              <option>{"Seleccionar rol"}</option>
            <option value={'Lider'}>Lider</option>
            <option value={'Jefe'}>Jefe</option>
            <option value={'Operario'}>Operario</option>
	    <option value={'Calidad'}>Calidad</option>
            <option value={'Cliente'}>Cliente</option>
        </select>
        {lockAdministratorIdentity && (
          <p className="mt-1 text-xs text-gray-500">La identificacion y el rol Jefe estan protegidos mientras este usuario sea el administrador designado.</p>
        )}
      </div>
      <label className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          name="x_studio_new_material"
          checked={Boolean(formData.x_studio_new_material)}
          onChange={handleChange}
          className="h-4 w-4"
        />
        Permite agregar materiales
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className='disabled:opacity-50 font-bold bg-[#2FD28E] p-3 rounded-md'
          disabled={loading || isFormInvalid}
        >
          {!user ? "Crear Usuarios" : "Guardar Cambios"}
          {loading && <Spinner /> }
        </button>
        {user && (
          <button
            type="button"
            onClick={deleteUser}
            className='disabled:opacity-50 font-bold bg-red-500 text-white p-3 rounded-md'
            disabled={loading}
          >
            Eliminar Usuario
          </button>
        )}
      </div>
    </form>
  )
}
