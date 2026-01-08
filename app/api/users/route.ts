import { NextResponse } from "next/server";
import { getUsers, createUsers, updateUsers } from "./users";

/**
 * API endpoint POST /api/companies
 * 
 * Al consultar esta ruta se va a ajecutar la funcion createCompany
 * que devuelve los datos de la compania si esta se creo existosamente.
 * Si no se puede crear, se retorna un error con el detalle.
 * 
 * Esta API esta hecha esclusivamente para consultarla desde componentes
 * del lado del cliente
 */
export async function POST(req: Request) {
  const body = await req.json();
  const users = await createUsers(body)

  return NextResponse.json(users);
}

/**
 * API endpoint GET /api/companies
 * 
 * Al hacer un GET a este endpoint se retorna un array de objetos
 * con los datos de las companias
 * 
 * Esta API esta hecha esclusivamente para consultarla desde componentes
 * del lado del cliente
 */
export async function GET(req: Request) {
  const users = await getUsers()

  return NextResponse.json(users);
}

/**
 * API endpoint PUT /api/companies
 * 
 * Al hacer un PUT a este endpoint actualiza la compania por su ID
 * y retorna los datos actualizados
 * 
 * Esta API esta hecha esclusivamente para consultarla desde componentes
 * del lado del cliente
 */
export async function PUT(req: Request) {
  const body = await req.json();
  const updatedUsers = await updateUsers(body)

  return NextResponse.json(updatedUsers);
}
