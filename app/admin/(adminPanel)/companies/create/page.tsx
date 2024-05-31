import { ChronosCompanyForm } from "@/ui/admin/companies/company-form";
import Link from "next/link";

export default async function Page() {

  return (
    <>
      <div className="flex justify-between items-center border-b-2 pb-4 mb-5">
        <h6 className="font-bold">Crear Compania</h6>
        <Link href={"/admin/companies"} className="bg-gray-100 text-gray-800 py-1 px-4 rounded hover:bg-gray-300">Cancelar</Link>
      </div>
      <ChronosCompanyForm />
    </>
  );
}