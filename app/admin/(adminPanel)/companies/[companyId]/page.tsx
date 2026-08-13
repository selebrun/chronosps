import Link from "next/link";
import { type ChronosCompany } from "@/types/chronosCompany";
import { getCompanyByID, getCompanyJefeUsers } from "@/app/api/companies/companies";
import { ChronosCompanyForm } from "@/ui/admin/companies/company-form";

export default async function Page({
  params
}: {
  params: { companyId: string };
}) {
  const { companyId } = params;
  const [company, companyJefes] = await Promise.all([
    getCompanyByID(companyId) as Promise<ChronosCompany>,
    getCompanyJefeUsers(companyId),
  ]);

  return (
    <>
      <div className="flex justify-between items-center border-b-2 pb-4 mb-5">
        <h6 className="font-bold">Editar Compania</h6>
        <Link href={"/admin/companies"} className="bg-gray-100 text-gray-800 py-1 px-4 rounded hover:bg-gray-300">Cancelar</Link>
      </div>
      <ChronosCompanyForm company={company} companyJefes={companyJefes}/>
    </>
  );
}
