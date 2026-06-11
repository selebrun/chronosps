"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { type ChronosCompany } from "@/types/chronosCompany";

import { Spinner } from '@/ui/spinner';

export function ChronosCompanyForm({
  company
}: {
  company?: ChronosCompany
}) {

  const router = useRouter();

  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const [formData, setFormData] = useState<ChronosCompany>({
    id_company: company?.id_company || '',
    name: company?.name || '',
    url: company?.url || '',
    domain: company?.domain || '',
    database: company?.database || '',
    user_default: company?.user_default || '',
    password: company?.password || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const createCompany = async () => {
    formData["id_company"] = uuidv4()
    const response = await fetch("/api/companies", {
      method: 'POST',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      setFormError("Ha ocurrido un error al intentar crear una compania");
      setLoading(false);
    }

    navigateOnSuccess()
  };

  const updateCompany = async () => {
    if (!company?.id_company) return
    formData["id_company"] = company.id_company
    const response = await fetch("/api/companies", {
      method: 'PUT',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      setFormError("Ha ocurrido un error al intentar editar la compania");
      setLoading(false);
    }

    navigateOnSuccess()
  };

  const getErrorMessage = async (response: Response, fallback: string) => {
    try {
      const data = await response.json();
      return data?.message || fallback;
    } catch {
      return fallback;
    }
  };

  const deleteCompany = async () => {
    if (!company?.id_company) return;
    const shouldDelete = window.confirm(`Eliminar compania ${formData.name}?`);
    if (!shouldDelete) return;

    setLoading(true);
    setFormError(null);

    try {
      const response = await fetch("/api/companies", {
        method: 'DELETE',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id_company: company.id_company })
      });

      if (!response.ok) {
        const message = await getErrorMessage(response, "Ha ocurrido un error al intentar eliminar la compania");
        setFormError(message);
        return;
      }

      navigateOnSuccess();
    } catch (error) {
      console.error("Error deleting company:", error);
      setFormError("Ha ocurrido un error inesperado al eliminar la compania");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Si la compania no vienen en las Props del componente
    // se asume que la compania no existe y se crea una nueva
    if (!company) {
      createCompany()
    } else {
      updateCompany()
    }
  };

  const navigateOnSuccess = () => {
    router.push("/admin/companies");
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
        <label htmlFor="name" className="text-xs block text-gray-700 font-bold mb-2">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData?.name?.trim()}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="domain" className="text-xs block text-gray-700 font-bold mb-2">
          Domain
        </label>
        <input
          type="text"
          id="domain"
          name="domain"
          value={formData?.domain?.trim()}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="url" className="text-xs block text-gray-700 font-bold mb-2">
          URL
        </label>
        <input
          type="text"
          id="url"
          name="url"
          value={formData?.url?.trim()}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="database" className="text-xs block text-gray-700 font-bold mb-2">
          Database
        </label>
        <input
          type="text"
          id="database"
          name="database"
          value={formData?.database?.trim()}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div className="mb-4">
        <label htmlFor="user_default" className="text-xs block text-gray-700 font-bold mb-2">
          Username
        </label>
        <input
          type="text"
          id="user_default"
          name="user_default"
          value={formData?.user_default?.trim()}
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
          type="password"
          id="password"
          name="password"
          value={formData?.password?.trim()}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md"
          required
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className='disabled:opacity-50 font-bold bg-[#2FD28E] p-3 rounded-md'
          disabled={loading || !formData.name || !formData.domain || !formData.url || !formData.database || !formData.user_default || !formData.password}
        >
          {!company ? "Crear Compania" : "Guardar Cambios"}
          {loading && <Spinner /> }
        </button>
        {company && (
          <button
            type="button"
            onClick={deleteCompany}
            className='disabled:opacity-50 font-bold bg-red-500 text-white p-3 rounded-md'
            disabled={loading}
          >
            Eliminar Compania
          </button>
        )}
      </div>
    </form>
  )
}
