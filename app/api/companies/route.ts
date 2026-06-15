import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCompanies, createCompany, updateCompany, deleteCompany } from "./companies";
import { ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from "@/app/api/admin-auth/adminSession";

function requireAdminSession() {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidAdminSessionToken(token)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }
  return null;
}

export async function POST(req: Request) {
  const authError = requireAdminSession();
  if (authError) return authError;

  try {
    const body = await req.json();
    const company = await createCompany(body);
    return NextResponse.json(company);
  } catch (error) {
    console.error("Error en POST /api/companies:", error);
    return NextResponse.json({ message: "No se pudo crear la compania" }, { status: 500 });
  }
}

export async function GET() {
  const authError = requireAdminSession();
  if (authError) return authError;

  try {
    const companies = await getCompanies();
    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error en GET /api/companies:", error);
    return NextResponse.json({ message: "No se pudieron consultar las companias" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const authError = requireAdminSession();
  if (authError) return authError;

  try {
    const body = await req.json();
    const updatedCompany = await updateCompany(body);
    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error("Error en PUT /api/companies:", error);
    return NextResponse.json({ message: "No se pudo actualizar la compania" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const authError = requireAdminSession();
  if (authError) return authError;

  try {
    const body = await req.json();
    const deletedCompany = await deleteCompany(body);

    if (!deletedCompany) {
      return NextResponse.json({ message: "Compania no encontrada" }, { status: 404 });
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
    return NextResponse.json({ message: "No se pudo eliminar la compania" }, { status: 500 });
  }
}
