import { getCompanies } from "@/app/api/companies/companies";
import { type ChronosCompany } from "@/types/chronosCompany";
import Link from "next/link";


export default async function Page() {
  const companies = await getCompanies() as ChronosCompany[]

  return (
    <div className="md:col-span-3 relative overflow-x-auto overflow-y-auto max-w-full max-h-[60vh] w-full" >

      <div className="flex justify-between items-center border-b-2 pb-4">
        <h6 className="font-bold">Companias</h6>
        <Link href={"companies/create"} className="bg-blue-500 text-white py-1 px-4 rounded hover:bg-blue-600">Crear Compania</Link>
      </div>

      {companies.map((company: ChronosCompany) => (
        <div
          key={company.id_company}
          className="flex justify-between items-center py-4 border-b"
        >
          <span className="text-lg">{company.name}</span>
          <Link
            href={`companies/${company.id_company}`}
            className="bg-blue-500 text-white py-1 px-4 rounded hover:bg-blue-600"
          >
            Editar
          </Link>
        </div>
      ))}

    </div>
  );
}