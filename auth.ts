import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { removeSpecialCharacters } from "@/helper/removeSpecialCharacters";

//Services
//import { getUsersFromOdoo } from '@/app/api/odoo/odooUsers';
import { getUsers } from "./app/api/users/users";
import { getOdooData } from "@/app/api/odoo/odooService";


export const config = {
    providers: [
      CredentialsProvider({
        name: "Credentials",
        id: "credentials",
        credentials: {
          email: { label: "Email", type: "text", placeholder: "jsmith" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials: any) {
          const { username, password, company_id, isChronosAdmin } = credentials;

          /*
          * La constante isChronosAdmin, es de uso exclusivo
          * para la ruta /admin donde se muestra el panel de administeracion interno
          * de Chronos Piso.
          * 
          * Sise desea logear un usuario interno o admin Chronos se debe
          * enviar isChronosAdmin = true en el mentodo signIn("credentials")
          */

          if (isChronosAdmin) {
            if (process.env.CHRONOS_ADMIN_USER !== username ||
              process.env.CHRONOS_ADMIN_PASSWORD !== password) return null

            const adminUser = {
              name: "Chronos Admin",
              email: username,
              company_id: null,
              role: "chronosAdmin",
            }
            return adminUser
          }
      
          //const odooUsers: any = await getUsersFromOdoo(company_id);

          const chronosUsers: any = await getUsers();

  

          if (!chronosUsers.length) return null;
       
          const user = chronosUsers.find((user: any) => removeSpecialCharacters(user.code).trim() === username && user.password.trim() === password );      
          if (!user) return null;
          let odoo_employee_id = Number(user?.odoo_id) || 0;
          let odoo_user_id = Number(user?.odoo_user_id) || 0;
          await new Promise<void>((resolve, reject) => {
              getOdooData('hr.employee', [], ['id', 'name', 'job_id', 'work_email', 'identification_id', 'user_id'], false, false, user.id_company, (odoo_user: any) => {
                  if (odoo_user && odoo_user?.data?.length) {
                      const userOdoo = odoo_user.data.find((item: any) => item.identification_id === user?.code.trim());
                      if (userOdoo) {
                          odoo_employee_id = userOdoo.id;
                          odoo_user_id = Array.isArray(userOdoo.user_id) ? userOdoo.user_id[0] : userOdoo.user_id || odoo_user_id;
                      }
                  }
                  resolve();
              },
              false
              );
          });
          
          const user_data = {
            name: user?.name?.trim(),
            email: user?.email?.trim(),
            company_id: user?.id_company?.trim(),
            odoo_id:  odoo_employee_id,
            odoo_user_id: odoo_user_id,
            document: user?.code?.trim(),
            role: user?.rol?.trim(),
            materiales: Boolean(user?.x_studio_new_material),
          }
      
          return user_data as any;
  
        },
      }),
    ],
    pages: {
      signIn: "/login",
    },
    session: {
      strategy: "jwt",
    },
    callbacks: {
      async jwt({ token, user }: any) {
        if (user) token = { ...user };
        return token;
      },
      async session({ session, token }: any) {
        session.user = token as any;
        return session;
      },
    },
} satisfies NextAuthOptions

// getServerSession to use in server Context
export function auth(...args: [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]] | [NextApiRequest, NextApiResponse] | []) {
  return getServerSession(...args, config)
}

