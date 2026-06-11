import { NextResponse } from "next/server";
import { getCompanies, createCompany, updateCompany, deleteCompany } from "./companies";

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
  const company = await createCompany(body)

  return NextResponse.json(company);
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
  const companies = await getCompanies()

  return NextResponse.json(companies);
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
  const updatedCompany = await updateCompany(body)

  return NextResponse.json(updatedCompany);
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const deletedCompany = await deleteCompany(body);

    if (!deletedCompany) {
      return NextResponse.json(
        { message: "Compania no encontrada" },
        { status: 404 }
      );
    }

    if (deletedCompany.status === false) {
      return NextResponse.json(
        { message: deletedCompany.message, usersCount: deletedCompany.usersCount },
        { status: 409 }
      );
    }

    return NextResponse.json(deletedCompany);
  } catch (error) {
    console.error("Error en DELETE /api/companies:", error);
    return NextResponse.json(
      { message: "No se pudo eliminar la compania" },
      { status: 500 }
    );
  }
}
