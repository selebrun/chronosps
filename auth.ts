import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { removeSpecialCharacters } from "@/helper/removeSpecialCharacters";

//Services
//import { getUsersFromOdoo } from '@/app/api/odoo/odooUsers';
import { getUsers, refreshUserOdooLink } from "./app/api/users/users";


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
       
          let user = chronosUsers.find((user: any) => removeSpecialCharacters(user.code).trim() === username && user.password.trim() === password );
          if (!user) return null;
          const role = user?.rol?.trim();
          const shouldRefreshOdooLink = !Number(user?.odoo_id) || (['Lider', 'Jefe'].includes(role) && !Number(user?.odoo_user_id));

          if (shouldRefreshOdooLink) {
            user = await refreshUserOdooLink(user);
          }
          
          const user_data = {
            name: user?.name?.trim(),
            email: user?.email?.trim(),
            company_id: user?.id_company?.trim(),
            odoo_id: Number(user?.odoo_id) || 0,
            odoo_user_id: Number(user?.odoo_user_id) || 0,
            document: user?.code?.trim(),
            role,
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
