/* use client */
"use client";
import { useState  } from "react";
import { v4 as uuidv4 } from 'uuid';
import NewCompanyForm from "@/ui/new-company-form/NewCompanyForm";
import { useRouter } from "next/navigation";


interface FormData {
  "name_of_the_company"?: string;
  "id_of_the_company"?: number;
  "domain"?: string;
  "URL"?: string;
  "port"?: number;
  "DB"?: string;
  "username"?: string;
  "password"?: string;
}

export function CompaniesList({ companies }:{ companies: any }) {
  const [formData, setFormData] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [companiesCurrent, setCompaniesCurrent] = useState(companies);
  const [onEdit, setOnEdit] = useState(false);
  const userAdmin = localStorage.getItem('admin')?.replace(/^['"](.*)['"]$/, '$1');
  const router = useRouter();


  if (userAdmin !== process.env.NEXT_PUBLIC_USER_ADMIN) {
    localStorage.removeItem('admin')
    return router.push("/admin/login")
  }

  const handleChange = (value: any, name: any) => {
    setFormData((prevFormData:any) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handleSave = () => {
    fetchCompanies()
    setFormData({});
  };

  const toggleForm = () => {
    setShowForm((prevShowForm) => !prevShowForm);
    setFormData({});
  };

  const onEditCompany = (company: any) => {
    setFormData(company);
    setShowForm(true)
    setOnEdit(true)
  }

  const fetchCompanies = async () => {
    formData["id_company"] = uuidv4()
    try {
      const response = await fetch("/api/companies", {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }
      const data = await response.json();
      if (response.status === 200) {
        setCompaniesCurrent((prevState:any )=> [...prevState, data]);
        setShowForm(!showForm)
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const editCompanies = async () => {
    try {
      const response = await fetch("/api/companies", {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }
      const data = await response.json();

      if (response.status === 200) {
        const update = companiesCurrent.map((item: any) =>{
          if (item.id_company === data.id_company) {
            return data; 
          } else {
            return item; // Mantener el elemento sin cambios
          }
        })
        setCompaniesCurrent(update);
        setOnEdit(false)
        setShowForm(!showForm)
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  return (
    <div className="space-y-8 relative overflow-x-auto overflow-y-auto max-w-full max-h-[60vh] rounded">
      <div className="space-y-10">
        <div className="flex justify-between items-center ">
          <div className="font-semibold"> Historial de Compañia</div>
          <div>
            <button
              className="bg-[#4584CE] p-2 rounded-md"
              onClick={toggleForm}
            >
              {showForm ? "X" : "Crear Nueva Compañía"}
            </button>
          </div>
        </div>
        {companiesCurrent.length > 0 && 
          !showForm &&
            <div>
            {companiesCurrent?.map((item:any)=> (
              <div key={item.name} className="flex justify-center mb-5">
                  <div className="rounded border border-blue-[#020630] bg-[#F2F5FA] p-2 w-full">{item.name}</div>
                  <div className="ml-20">
                      <button
                      className="bg-[#4584CE] p-2 rounded-md"
                      onClick={() => onEditCompany(item)}
                    >
                      Editar
                    </button>
                  </div>
              </div>
            ))}
          </div>}
        {showForm && (
          <div>
            <NewCompanyForm
              handleChange={handleChange}
              label="Name of the company"
              name='name'
              value={formData["name"]}
            />
            <NewCompanyForm
              handleChange={handleChange}
              label="Domain"
              name="domain"
              value={formData["domain"]}
            />
            <NewCompanyForm
              handleChange={handleChange}
              label="URL"
              name="url"
              value={formData["url"]}
            />
            <NewCompanyForm
              handleChange={handleChange}
              label="DB"
              name="database"
              value={formData["database"]}
            />
            <NewCompanyForm
              handleChange={handleChange}
              label="Username"
              name="user_default"
              value={formData["user_default"]}
            />
            <NewCompanyForm
              handleChange={handleChange}
              label="Password"
              name="password"
              value={formData["password"]}
            />
            <div className="flex justify-center pt-3">
              <button
                type="submit"
                className='disabled:opacity-50 font-bold bg-[#2FD28E] p-3 rounded-md'
                onClick={() => onEdit ?editCompanies() : handleSave()}
                disabled={formData.name_of_the_company === ''}

              >
                Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

