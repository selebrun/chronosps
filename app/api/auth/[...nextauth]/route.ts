import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

//Services
import { getUsersFromOdoo } from '@/app/api/odoo/odooUsers';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      id: "credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any) {
        const odooUsers: any = await getUsersFromOdoo(credentials.company_id);
        if (!odooUsers.length) return;
       
        const user = odooUsers.find((user: any) => user.vat === credentials.username && user.x_studio_password === credentials.password );
        
        const user_data = {
          name: user?.name,
          email: user?.email,
          mobile: user?.mobile,
          password: user?.x_studio_password,
          odoo_id: user?.id,
          document: user?.vat,
          role: user?.x_studio_rol_en_produccin,
          materiales: user?.x_studio_agregar_materiales,
          active: true
        }
    
        if (user) return user_data
    
        return null
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
      if (user) token.user = user;
      return token;
    },
    async session({ session, token }: any) {
      session.user = token.user as any;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
