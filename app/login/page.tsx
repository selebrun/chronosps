import SignIn from "./SignIn";
import { getCompanies } from "@/app/api/companies/companies";

export default async function Page() {
  const companies = await getCompanies()
    .then((items) => items.map((company: any) => ({
      id_company: company?.id_company?.toString?.().trim?.() || '',
      name: company?.name?.toString?.().trim?.() || '',
    })).filter((company: any) => company.id_company && company.name))
    .catch((error) => {
      console.error('No se pudieron consultar las empresas para el login:', error);
      return [];
    });

  return (
      <SignIn companies={companies}></SignIn>
  );
}
