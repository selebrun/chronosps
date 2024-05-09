/* use client */
"use client";
import { useState, useEffect  } from "react";
import { v4 as uuidv4 } from 'uuid';
import NewCompanyForm from "@/ui/new-company-form/NewCompanyForm";
import { useRouter } from "next/navigation";



export function CompaniesList({ currentCompanies, currentuUsers }:{ currentCompanies: any, currentuUsers:any }) {
  const [formData, setFormData] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [showFormUsers, setShowFormUsers] = useState(false);
  const [companiesCurrent, setCompaniesCurrent] = useState(currentCompanies);
  const [onEdit, setOnEdit] = useState(false);
  const [onEditUsers, setOnEditUsers] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [users, setUsers] = useState<any>(currentuUsers);
  const [formUsers, setFormUsers] = useState<any>({});
  const router = useRouter();
  
  useEffect(()=>{
    const userAdmin = localStorage?.getItem('admin')?.replace(/^['"](.*)['"]$/, '$1');
     if (userAdmin !== process.env.NEXT_PUBLIC_USER_ADMIN) {
      localStorage.removeItem('admin')
      return router.push("/admin/login")
    }
  }, [])


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
    setShowUsers(false);
  };

  const onEditCompany = (company: any) => {
    setFormData(company);
    setShowForm(true)
    setOnEdit(true)
  }

  const toggleFormUsers = () => {
    setShowFormUsers((prevShowFormUsers) => !prevShowFormUsers);
    setFormUsers({})
  };

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

  const onCreateUsers = () => {
    setShowUsers(true);
  };


  const editUsers = async () => {
    try {
      const response = await fetch("/api/users", {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formUsers)
      });
      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }
      const data = await response.json();

      if (response.status === 200) {
        const update = users.map((item: any) =>{
          if (item.id_company === data.id_company) {
            return data; 
          } else {
            return item; // Mantener el elemento sin cambios
          }
        })
        setUsers(update);
        setOnEditUsers(false)
        setShowFormUsers(!showFormUsers)
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  }
  
  const handleSaveUsers = async () => {
    createUsers()
  }


  const handleChangeUsers = (value: any, name: any) => {
    setFormUsers((prevFormData:any) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const onUsersEdit = (user: any) => {
    setFormUsers(user);
    setShowFormUsers(true)
    setOnEditUsers(true)
  }


  const createUsers = async () => {
    try {
      const response = await fetch("/api/users", {
        method: 'POST',
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formUsers)
      });
      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }
      const data = await response.json();
      if (response.status === 200) {
        setUsers((prevState:any)=> [...prevState, data]);
        setShowFormUsers(!showFormUsers)
        setFormUsers({})
      }

    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };


  return (
    <>
      <div className="space-y-8 relative max-w-full max-h-[60vh] rounded">
        <div className="space-y-10">
          <div className="flex  ">
            <div className="font-semibold  w-1/5"> 
                {showUsers ? "Historial de usuarios" : "Historial de Compañia"}
              <div className="mt-9">
                <button
                  className="bg-[#4584CE] p-1 w-full rounded-md mr-2 hover:bg-[#73b9f5]"
                  onClick={onCreateUsers}
                >
                  {"Ver usuarios"}
                </button>
                <button
                  className="bg-[#4584CE] p-1 w-full rounded-md mr-2 mt-3 hover:bg-[#73b9f5]"
                  onClick={() => {
                    setShowUsers(false)
                    setShowFormUsers(false)
                    setShowForm(false)
                  }
                  }
                >
                  {"Ver compañias"}
                </button>
              </div>
            </div>
            <div className="border-l h-auto mx-4"></div>
            <div className="relative overflow-x-auto overflow-y-auto max-w-full max-h-[60vh] w-full">
              {companiesCurrent.length > 0 && !showUsers &&
              !showForm &&
                <div>
                  <div className="mb-4 flex justify-between">
                      <div className="font-semibold  w-1/5">Compañias</div>
                      <button
                        className="bg-[#4584CE] p-2 rounded-md  hover:bg-[#73b9f5]"
                        onClick={toggleForm}>
                        {"Crear compañía"}
                      </button>
                  </div>
                  {companiesCurrent?.map((item:any, index: number)=> (
                      <div key={index} className="flex justify-center mb-5">
                          <div className="rounded border border-blue-[#020630] bg-[#F2F5FA] p-2 w-full">{item.name}</div>
                          <div className="ml-20">
                              <button
                              className="bg-[#4584CE] p-2 rounded-md  hover:bg-[#73b9f5]"
                              onClick={() => onEditCompany(item)}
                            >
                              Editar
                            </button>
                          </div>
                      </div>
                    ))}
                </div>}
                  {showForm && !showUsers && (
                    <div>
                      <div className="mb-4 flex justify-end">
                          <button
                            className="bg-[#4584CE] p-2 rounded-md  w-[70px]  hover:bg-[#73b9f5]"
                            onClick={toggleForm}>
                            {"X" }
                          </button>
                      </div>
                      <NewCompanyForm
                        handleChange={handleChange}
                        label="Name of the company"
                        name='name'
                        value={formData["name"]?.trim()}
                      />
                      <NewCompanyForm
                        handleChange={handleChange}
                        label="Domain"
                        name="domain"
                        value={formData["domain"]?.trim()}
                      />
                      <NewCompanyForm
                        handleChange={handleChange}
                        label="URL"
                        name="url"
                        value={formData["url"]?.trim()}
                      />
                      <NewCompanyForm
                        handleChange={handleChange}
                        label="DB"
                        name="database"
                        value={formData["database"]?.trim()}
                      />
                      <NewCompanyForm
                        handleChange={handleChange}
                        label="Username"
                        name="user_default"
                        value={formData["user_default"]?.trim()}
                      />
                      <NewCompanyForm
                        handleChange={handleChange}
                        label="Password"
                        name="password"
                        value={formData["password"]?.trim()}
                      />
                      <div className="flex justify-end pt-3">
                        <button
                          type="submit"
                          className='disabled:opacity-50 font-bold bg-[#2FD28E] p-3 rounded-md '
                          onClick={() => onEdit ? editCompanies() : handleSave()}
                          disabled={!formData.name || !formData.domain || !formData.url || !formData.database || !formData.user_default || !formData.password}

                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}
                {showUsers && !showFormUsers &&
                  <div>
                    {users.length > 0 && showUsers  &&
                      <div>
                        <div className="mb-4 flex justify-between">
                            <div  className="font-semibold  w-1/5">Usuarios</div>
                            <button
                              className="bg-[#4584CE] p-2 rounded-md  hover:bg-[#73b9f5]"
                              onClick={toggleFormUsers}>
                              {"Crear usuarios"}
                            </button>
                        </div>
                        {users?.map((item:any, index: number)=> (
                            <div key={index} className="flex justify-center mb-5">
                                <div className="rounded border border-blue-[#020630] bg-[#F2F5FA] p-2 w-full">{item.name}</div>
                                <div className="ml-20">
                                    <button
                                    className="bg-[#4584CE] p-2 rounded-md  hover:bg-[#73b9f5]"
                                    onClick={() => onUsersEdit(item)}
                                  >
                                    Editar
                                  </button>
                                </div>
                            </div>
                          ))}
                      </div>}
                  </div>}
                  {showFormUsers &&  showUsers &&(
                    <div>
                      <div className="mb-4 flex justify-end">
                          <button
                            className="bg-[#4584CE] p-2 rounded-md w-[70px]  hover:bg-[#73b9f5]"
                            onClick={toggleFormUsers}>
                            {"X" }
                          </button>
                      </div>
                        <NewCompanyForm
                          handleChange={handleChangeUsers}
                          label="Número de identificación"
                          name='code'
                          value={formUsers["code"]?.trim()}
                        />
                          <NewCompanyForm
                          handleChange={handleChangeUsers}
                          label="Nombre"
                          name='name'
                          value={formUsers["name"]?.trim()}
                        />
                         <NewCompanyForm
                          handleChange={handleChangeUsers}
                          label="email"
                          name='email'
                          value={formUsers["email"]?.trim()}
                        />
                         <NewCompanyForm
                          handleChange={handleChangeUsers}
                          label="Password"
                          name='password'
                          value={formUsers["password"]?.trim()}
                        />
                        <div>
                          <label
                              className="text-gray-700 text-sm font-bold whitespace-nowrap mb-1"
                            >
                              {"Compañia"}
                            </label>
                            <select 
                            value={formUsers?.id_company?.trim()}
                            onChange={(e) => handleChangeUsers(e.target.value, 'id_company')}
                            className="w-full bg-white shadow border rounded py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline">
                              <option>{"Seleccionar compañia"}</option>
                              {companiesCurrent?.map((item:any, index: number)=> (
                                  <option value={item.id_company.trim()} key={index}>{item.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mt-2">
                          <label
                              className="text-gray-700 text-sm font-bold whitespace-nowrap mb-1"
                            >
                              {"Rol"}
                            </label>
                            <select
                            onChange={(e) => handleChangeUsers(e.target.value, 'rol')}
                            value={formUsers?.rol?.trim()}
                            className="w-full bg-white shadow border rounded py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline">
                                <option>{"Seleccionar rol"}</option>
                              <option value={'Lider'}>Lider</option>
                              <option value={'Operario'}>Operario</option>
                              <option value={'Jefe'}>Jefe</option>
                            </select>
                        </div>
                      <div className="flex justify-end pt-3">
                        <button
                          type="submit"
                          className='disabled:opacity-50 font-bold bg-[#2FD28E] p-3 rounded-md'
                          onClick={() => onEditUsers ? editUsers() : handleSaveUsers()}
                          disabled={!formUsers.name || !formUsers.rol || !formUsers.email || !formUsers.id_company || !formUsers.password || !formUsers.code}
                        >
                          Guardar
                        </button>
                      </div>
                    </div>
                  )}
            </div>
            
          </div>
        </div>
      </div>
    </>
  );
}
