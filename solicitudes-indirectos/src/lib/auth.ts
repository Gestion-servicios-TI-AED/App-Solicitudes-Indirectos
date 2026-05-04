import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
// Roles stored as JSON string array in DB

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            frentesAsignados: { include: { frente: true } },
          },
        });

        if (!user || !user.password || !user.activo) return null;

        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!passwordValid) return null;

        let parsedRoles: string[];
        try {
          parsedRoles = JSON.parse(user.roles || '["SOLICITANTE"]');
        } catch {
          parsedRoles = ["SOLICITANTE"];
        }

        return {
          id: user.id,
          email: user.email,
          name: user.nombre,
          rol: parsedRoles[0] ?? "SOLICITANTE",
          roles: parsedRoles,
          cargo: user.cargo,
          telefono: user.telefono,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in
        token.id = user.id;
        token.roles = (user as any).roles ?? ["SOLICITANTE"];
        token.rol = ((user as any).roles ?? ["SOLICITANTE"])[0];
        token.cargo = (user as any).cargo;
        token.telefono = (user as any).telefono;
      } else if (token.id) {
        // Subsequent requests — always refresh roles from DB so changes take effect immediately
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { roles: true, rol: true, cargo: true, telefono: true, activo: true },
          });
          if (dbUser && dbUser.activo) {
            let parsedRoles: string[];
            try { parsedRoles = JSON.parse(dbUser.roles || '["SOLICITANTE"]'); }
            catch { parsedRoles = [dbUser.rol ?? "SOLICITANTE"]; }
            token.roles = parsedRoles;
            token.rol = parsedRoles[0] ?? "SOLICITANTE";
            token.cargo = dbUser.cargo ?? undefined;
            token.telefono = dbUser.telefono ?? undefined;
          }
        } catch {
          // DB unavailable — keep existing token values
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string[];
        session.user.rol = (token.roles as string[])[0] ?? "";
        session.user.cargo = token.cargo as string;
        session.user.telefono = token.telefono as string;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions) as any;
