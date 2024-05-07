import { getCompanies, createCompany, updateCompany } from "../../api/companies/companies";
import { CompaniesList }   from "./CompaniesList";


export default async function Page() {
  const companies = await getCompanies()

  /* 
    EJEMPLOS DEL LADO DEL SERVIDOR
    const newCompanyData = {
      id_company: "7ac7aa42-008b-11ee-be56-0242120010",
      name: "Nueva Empresa Updated",
      url: "https://nuevaempresa.chronosps.com/",
      domain: "nuevaempresa.chronosps.com",
      database: "nueva-empresa-123456-update",
      user_default: "admin",
      password: "password123"
    };
  
    const newCompany = await createCompany(newCompanyData); 
  
    const updatedCompany = await updateCompany(newCompanyData);
  */

  return (
    <>
      <CompaniesList companies={companies} />
    </>
  );
}