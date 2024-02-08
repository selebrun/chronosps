import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

//Services
import { getUsersFromOdoo } from '@/app/api/odoo/odooUsers';
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
          const { username, password, company_id } = credentials;
  
          const odooUsers: any = await getUsersFromOdoo(company_id);
   

          if (!odooUsers.length) return null;
       
          const user = odooUsers.find((user: any) => user.vat === username && user.x_studio_password === password );      
          if (!user) return null;
          let odoo_user_id = 0
          getOdooData('res.users',[['partner_id','=',user.id],['active','=',true]],['id'],false, false, company_id, (odoo_user: any) => {
            if( odoo_user && odoo_user.data && odoo_user.data[0] && odoo_user.data[0].id) odoo_user_id = odoo_user.data[0].id
          })

          const user_data = {
            name: user?.name,
            email: user?.email,
            company_id: company_id,
            mobile: user?.mobile,
            odoo_id: user?.id,
            odoo_user_id: odoo_user_id,
            document: user?.vat,
            role: user?.x_studio_rol_en_produccin,
            materiales: user?.x_studio_new_material,
            active: true
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