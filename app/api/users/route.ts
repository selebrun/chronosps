import { NextResponse } from "next/server";
import { getUsers, createUsers, updateUsers, deleteUsers } from "./users";

const requiredUserFields = [
  "code",
  "email",
  "id_company",
  "name",
  "password",
  "rol",
];

function getMissingUserFields(body: Record<string, any>) {
  return requiredUserFields.filter((field) => !body[field]?.toString().trim());
}

function isUserPayload(body: unknown): body is Record<string, any> {
  return !!body && typeof body === "object";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!isUserPayload(body)) {
      return NextResponse.json(
        { message: "Datos invalidos para crear el usuario" },
        { status: 400 }
      );
    }

    const missingFields = getMissingUserFields(body);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { message: "Datos incompletos para crear el usuario", fields: missingFields },
        { status: 400 }
      );
    }

    const users = await createUsers(body);
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error en POST /api/users:", error);
    return NextResponse.json(
      { message: "No se pudo crear el usuario" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const users = await getUsers();
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error en GET /api/users:", error);
    return NextResponse.json(
      { message: "No se pudieron consultar los usuarios" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    if (!isUserPayload(body)) {
      return NextResponse.json(
        { message: "Datos invalidos para actualizar el usuario" },
        { status: 400 }
      );
    }

    const missingFields = getMissingUserFields(body);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { message: "Datos incompletos para actualizar el usuario", fields: missingFields },
        { status: 400 }
      );
    }

    const updatedUsers = await updateUsers(body);
    if (!updatedUsers) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedUsers);
  } catch (error) {
    console.error("Error en PUT /api/users:", error);
    return NextResponse.json(
      { message: "No se pudo actualizar el usuario" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();

    if (!isUserPayload(body) || !body.code || !body.id_company) {
      return NextResponse.json(
        { message: "Datos incompletos para eliminar el usuario" },
        { status: 400 }
      );
    }

    const deletedUser = await deleteUsers(body);
    if (!deletedUser) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(deletedUser);
  } catch (error) {
    console.error("Error en DELETE /api/users:", error);
    return NextResponse.json(
      { message: "No se pudo eliminar el usuario" },
      { status: 500 }
    );
  }
}
