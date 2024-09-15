import NextAuth, { User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserWithRoleBynip } from "@/lib/db/operations";
import { verifyPassword } from "@/utils/password";
import { signInSchema } from "@/lib/zod";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import { CustomUser } from "@/lib/types/auth";
import { ZodError } from "zod"; // Import ZodError for handling

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        nip: { label: "NIP", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials): Promise<CustomUser | null> => {
        if (!credentials) return null;

        try {
          // Validate credentials with Zod
          const { nip, password } = signInSchema.parse(credentials); // Synchronous parsing for simplified error handling

          // Fetch user with role from the database
          const user = await getUserWithRoleBynip(nip);

          if (!user) {
            throw new Error("NIP anda tidak terdaftar."); // Custom error message for NIP
          }

          // Compare the provided password with the stored hash
          const passwordMatch = await verifyPassword(password, user.password);
          if (!passwordMatch) {
            throw new Error("Password salah."); // Custom error message for incorrect password
          }

          // Return user object if credentials are valid
          return {
            id: user.id!.toString(),
            nip: user.nip,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          // Handle Zod validation errors
          if (error instanceof ZodError) {
            // Format Zod errors into a single message string
            const formattedErrors = error.errors.map((err) => err.message).join(", ");
            throw new Error(formattedErrors); // Throw a user-friendly error message
          } else if (error instanceof Error) {
            // Handle generic errors
            throw new Error(error.message); // Pass specific error messages to the client
          } else {
            // Handle unknown errors
            throw new Error("An unknown error occurred.");
          }
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.role = token.role || null;
        session.user.nip = token.nip as string;
      }
      return session;
    },
    async jwt({ token, user }: { token: JWT; user?: CustomUser | User | undefined }) {
      if (user && "role" in user) {
        token.role = user.role;
        token.nip = user.nip;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);
