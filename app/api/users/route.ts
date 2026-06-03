import { NextResponse } from "next/server";
import { getUsers, createUsers, updateUsers } from "./users";

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

/**
 * API endpoint POST /api/users
 * 
 * Al consultar esta ruta se va a ejecutar la funcion createUsers
 * que devuelve los datos del usuario si se creo exitosamente.
 * Si no se puede crear, se retorna un error con el detalle.
 * 
 * Esta API esta hecha esclusivamente para consultarla desde componentes
 * del lado del cliente
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
<<<<<<< ours
<<<<<<< ours
    const users = await createUsers(body);

=======
=======
>>>>>>> theirs

    if (!isUserPayload(body)) {
      return NextResponse.json(
        { message: "Datos inválidos para crear el usuario" },
        { status: 400 }
      );
    }

    const missingFields = getMissingUserFields(body);
<<<<<<< ours

    if (missingFields.length > 0) {
      return NextResponse.json(
        { message: "Datos incompletos para crear el usuario", fields: missingFields },
        { status: 400 }
      );
    }

    const users = await createUsers(body);

>>>>>>> theirs
=======

    if (missingFields.length > 0) {
      return NextResponse.json(
        { message: "Datos incompletos para crear el usuario", fields: missingFields },
        { status: 400 }
      );
    }

    const users = await createUsers(body);

>>>>>>> theirs
    return NextResponse.json(users);
  } catch (error) {
    console.error("Error en POST /api/users:", error);
    return NextResponse.json(
      { message: "No se pudo crear el usuario" },
      { status: 500 }
    );
  }
}

/**
 * API endpoint GET /api/users
 * 
 * Al hacer un GET a este endpoint se retorna un array de objetos
 * con los datos de los usuarios
 * 
 * Esta API esta hecha esclusivamente para consultarla desde componentes
 * del lado del cliente
 */
<<<<<<< ours
<<<<<<< ours
export async function GET(req: Request) {
=======
export async function GET() {
>>>>>>> theirs
=======
export async function GET() {
>>>>>>> theirs
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

/**
 * API endpoint PUT /api/users
 * 
 * Al hacer un PUT a este endpoint actualiza el usuario por su código
 * y retorna los datos actualizados
 * 
 * Esta API esta hecha esclusivamente para consultarla desde componentes
 * del lado del cliente
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
<<<<<<< ours
<<<<<<< ours
    const updatedUsers = await updateUsers(body);

    if (!updatedUsers) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

=======
=======
>>>>>>> theirs

    if (!isUserPayload(body)) {
      return NextResponse.json(
        { message: "Datos inválidos para actualizar el usuario" },
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

<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
    return NextResponse.json(updatedUsers);
  } catch (error) {
    console.error("Error en PUT /api/users:", error);
    return NextResponse.json(
      { message: "No se pudo actualizar el usuario" },
      { status: 500 }
    );
  }
}
