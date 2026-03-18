import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import GithubProvider from "next-auth/providers/github";
import { connectDB } from "../../../../lib/db";
import User from "../../../../models/User";

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "email,public_profile",
        },
      },
    })
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })
  );
}

if (providers.length === 0) {
  console.warn("[Auth] WARNING: No OAuth providers (Google, Facebook, GitHub) are configured in .env. Authentication will not work until you provide Client IDs and Secrets.");
  // Add a dummy provider to prevent NextAuth from crashing if you want the app to at least boot
}

const handler = NextAuth({
  providers,
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/", // Use our custom login page (the root page)
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        await connectDB();

        // Find existing user by email
        let dbUser = await User.findOne({ email: user.email?.toLowerCase() });

        if (!dbUser) {
          // Create new user - generate a unique username from the profile name
          let baseUsername = (user.name || user.email?.split("@")[0] || "user")
            .replace(/[^a-zA-Z0-9ก-๙]/g, "")
            .substring(0, 15);

          // Ensure username is at least 3 chars
          if (baseUsername.length < 3) baseUsername = baseUsername + "user";

          // Check for duplicate username
          let username = baseUsername;
          let counter = 1;
          while (await User.findOne({ username })) {
            username = `${baseUsername}${counter}`;
            counter++;
          }

          dbUser = await User.create({
            username,
            email: user.email?.toLowerCase(),
            authProvider: account?.provider || "oauth",
            authProviderId: account?.providerAccountId || user.id,
            avatar: user.image || null,
          });

          console.log(`[Auth] New OAuth user created: ${username} via ${account?.provider}`);
        } else {
          // Update existing user's avatar if they don't have one
          if (!dbUser.avatar && user.image) {
            dbUser.avatar = user.image;
            await dbUser.save();
          }
        }

        return true;
      } catch (error) {
        console.error("[Auth] SignIn error:", error);
        return false;
      }
    },

    async jwt({ token, user, account }) {
      if (account && user) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email?.toLowerCase() });
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.username = dbUser.username;
            token.mongoId = dbUser._id.toString();
          }
        } catch (error) {
          console.error("[Auth] JWT callback error:", error);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).mongoId = token.mongoId;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
