import { getCompanies } from "../../api/companies/companies";
import { CompaniesList } from "../../../ui/companies/CompaniesList";
import { getUsers } from "../../api/users/users";

export default async function  Page() {
  const companies = await getCompanies()
  const users = await getUsers()

console.log(users, "usersusers")
  return (
    <>
      <CompaniesList currentCompanies={companies} currentuUsers={users}/>
    </>
  );
}