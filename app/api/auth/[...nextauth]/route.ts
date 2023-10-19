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

        console.log("odooUsersvvvvv", odooUsers)
        
        const user = odooUsers.find((user: any) => user.vat === credentials.username && user.password === credentials.password );

        if (user) return user
        
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