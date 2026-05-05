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
        console.log("========== LOGIN ATTEMPT ==========");
        console.log("credentials:", credentials);

        // 🔥 VERIFICAR ENV
        console.log("DB URL:", process.env.DATABASE_URL);

        // 🔥 TEST CONEXIÓN REAL A POSTGRES
        try {
          const test = await prisma.$queryRaw`SELECT 1`;
          console.log("✅ DB CONNECTED:", test);
        } catch (e) {
          console.log("❌ DB CONNECTION ERROR:", e);
          return null; // 🚨 si falla DB, no seguimos
        }

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials");
          return null;
        }

        // 🔥 COUNT (verifica que estás en la DB correcta)
        try {
          const count = await prisma.user.count();
          console.log("📊 USER COUNT:", count);
        } catch (e) {
          console.log("❌ USER COUNT ERROR:", e);
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            frentesAsignados: { include: { frente: true } },
          },
        });

        console.log("👤 USER RESULT:", user);

        if (!user) {
          console.log("❌ User not found in this database");
          return null;
        }

        console.log("🔐 Has password:", !!user.password);
        console.log("🟢 activo value:", user.activo);

        if (!user.password) {
          console.log("❌ Missing password");
          return null;
        }

        if (!user.activo) {
          console.log("❌ User inactive (activo=false/null)");
          return null;
        }

        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        console.log("🔑 Password valid:", passwordValid);

        if (!passwordValid) {
          console.log("❌ Invalid password");
          return null;
        }

        let parsedRoles: string[];

        try {
          parsedRoles = JSON.parse(user.roles || '["SOLICITANTE"]');
        } catch (e) {
          console.log("⚠️ Roles parse error:", e);
          parsedRoles = ["SOLICITANTE"];
        }

        const result = {
          id: user.id,
          email: user.email,
          name: user.nombre,
          rol: parsedRoles[0] ?? "SOLICITANTE",
          roles: parsedRoles,
          cargo: user.cargo,
          telefono: user.telefono,
        };

        console.log("✅ AUTH SUCCESS:", result);

        return result;
      }
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
