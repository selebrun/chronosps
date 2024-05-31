import { ChronosUsersForm } from "@/ui/admin/users/user-form";
import Link from "next/link";
import { getCompanies } from "@/app/api/companies/companies";
import { ChronosCompany } from "@/types/chronosCompany";

export default async function Page() {
  const companies = await getCompanies()  as ChronosCompany[]
  return (
    <>
      <div className="flex justify-between items-center border-b-2 pb-4 mb-5">
        <h6 className="font-bold">Crear Usuarios</h6>
        <Link href={"/admin/users"} className="bg-gray-100 text-gray-800 py-1 px-4 rounded hover:bg-gray-300">Cancelar</Link>
      </div>
      <ChronosUsersForm  companies={companies} />
    </>
  );
}