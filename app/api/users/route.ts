import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { config as authConfig } from "@/auth";
import { getUsers, getUsersByCompany, createUsers, updateUsers, deleteUsers } from "./users";
import { isCompanyAdministrator } from "@/app/api/companies/companies";
import { ADMIN_API_SESSION_COOKIE, ADMIN_SESSION_COOKIE, isValidAdminSessionToken } from "@/app/api/admin-auth/adminSession";

type UserManagementAccess = {
  scope: 'global' | 'company';
  companyId?: string;
  userCode?: string;
};

async function getUserManagementAccess(req: Request): Promise<UserManagementAccess | null> {
  const companyScopeRequested = req.headers.get('x-chronos-company-scope') === '1';
  if (companyScopeRequested) {
    const session = await getServerSession(authConfig);
    if (session?.user && await isCompanyAdministrator(session.user)) {
      return {
        scope: 'company',
        companyId: session.user.company_id?.toString?.().trim?.(),
        userCode: session.user.document?.toString?.().trim?.(),
      };
    }
    return null;
  }

  const token = cookies().get(ADMIN_API_SESSION_COOKIE)?.value || cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (isValidAdminSessionToken(token)) {
    return { scope: 'global' };
  }

  const session = await getServerSession(authConfig);
  if (session?.user && await isCompanyAdministrator(session.user)) {
    return {
      scope: 'company',
      companyId: session.user.company_id?.toString?.().trim?.(),
      userCode: session.user.document?.toString?.().trim?.(),
    };
  }
  return null;
}

function unauthorized() {
  return NextResponse.json({ message: "No autorizado" }, { status: 401 });
}

function applyCompanyScope(body: Record<string, any>, access: UserManagementAccess) {
  if (access.scope !== 'company') return body;
  const companyId = access.companyId || '';
  const requestedCompany = body.id_company?.toString?.().trim?.() || companyId;
  const originalCompany = body.original_id_company?.toString?.().trim?.() || companyId;
  if (requestedCompany !== companyId || originalCompany !== companyId) return null;

  return {
    ...body,
    id_company: companyId,
    original_id_company: companyId,
  };
}

function getMutationError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  const status = message.includes('administrador designado') ? 409 : 500;
  return NextResponse.json({ message }, { status });
}

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
  const access = await getUserManagementAccess(req);
  if (!access) return unauthorized();

  try {
    const requestedBody = await req.json();

    if (!isUserPayload(requestedBody)) {
      return NextResponse.json(
        { message: "Datos invalidos para crear el usuario" },
        { status: 400 }
      );
    }
    const body = applyCompanyScope(requestedBody, access);
    if (!body) return NextResponse.json({ message: 'No puede crear usuarios en otra empresa.' }, { status: 403 });

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
    return getMutationError(error, "No se pudo crear el usuario");
  }
}

export async function GET(req: Request) {
  const access = await getUserManagementAccess(req);
  if (!access) return unauthorized();

  try {
    const users = access.scope === 'company'
      ? await getUsersByCompany(access.companyId || '')
      : await getUsers();
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
  const access = await getUserManagementAccess(req);
  if (!access) return unauthorized();

  try {
    const requestedBody = await req.json();

    if (!isUserPayload(requestedBody)) {
      return NextResponse.json(
        { message: "Datos invalidos para actualizar el usuario" },
        { status: 400 }
      );
    }
    const body = applyCompanyScope(requestedBody, access);
    if (!body) return NextResponse.json({ message: 'No puede modificar usuarios de otra empresa.' }, { status: 403 });
    if (
      access.scope === 'company'
      && body.original_code?.toString?.().trim?.() === access.userCode
      && body.code?.toString?.().trim?.() !== access.userCode
    ) {
      return NextResponse.json(
        { message: 'No puede cambiar su propia identificacion mientras sea el administrador de la empresa.' },
        { status: 409 }
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
    return getMutationError(error, "No se pudo actualizar el usuario");
  }
}

export async function DELETE(req: Request) {
  const access = await getUserManagementAccess(req);
  if (!access) return unauthorized();

  try {
    const requestedBody = await req.json();

    if (!isUserPayload(requestedBody)) {
      return NextResponse.json(
        { message: "Datos incompletos para eliminar el usuario" },
        { status: 400 }
      );
    }
    const body = applyCompanyScope(requestedBody, access);
    if (!body) return NextResponse.json({ message: 'No puede eliminar usuarios de otra empresa.' }, { status: 403 });
    if (!body.code || !body.id_company) {
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
    return getMutationError(error, "No se pudo eliminar el usuario");
  }
}
