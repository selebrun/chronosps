import { getUsers } from "@/app/api/users/users";
import Link from "next/link";

export default async function Page() {
  const users = await getUsers()

  return (
    <div className="md:col-span-3 relative overflow-x-auto overflow-y-auto max-w-full max-h-[60vh] w-full">

      <div className="flex justify-between items-center border-b-2 pb-4">
        <h6 className="font-bold">Usuarios</h6>
        <Link href={"users/create"} className="bg-blue-500 text-white py-1 px-4 rounded hover:bg-blue-600">Crear usuario</Link>
      </div>

      {users.map((user, index) => (
        <div
          key={index}
          className="flex justify-between items-center py-4 border-b"
        >
          <span className="text-lg">{user.name}</span>
          <Link
            href={`users/${user.code}`}
            className="bg-blue-500 text-white py-1 px-4 rounded hover:bg-blue-600"
          >
            Editar
          </Link>
        </div>
      ))}

    </div>
  );
}