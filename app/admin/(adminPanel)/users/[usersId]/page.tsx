import Link from "next/link";
import { type ChronosUsers } from "@/types/chronosUsers";
import { getUsersByID } from "@/app/api/users/users";
import { getCompanies } from "@/app/api/companies/companies";
import { ChronosUsersForm } from "@/ui/admin/users/user-form";
import { type ChronosCompany } from "@/types/chronosCompany";

export default async function Page({
  params
}: {
  params: { usersId: string };
}) {
  const { usersId } = params;
  const users = await getUsersByID(usersId) as ChronosUsers
  const companies = await getCompanies() as ChronosCompany[]

  return (
    <>
      <div className="flex justify-between items-center border-b-2 pb-4 mb-5">
        <h6 className="font-bold">Editar usuario</h6>
        <Link href={"/admin/users"} className="bg-gray-100 text-gray-800 py-1 px-4 rounded hover:bg-gray-300">Cancelar</Link>
      </div>
        <ChronosUsersForm user={users} companies={companies}/>
    </>
  );
}