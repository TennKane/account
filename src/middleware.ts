import NextAuth from "next-auth";

// 轻量的中间件 auth 实例 —— 不导入数据库/密码模块
// 只用于验证 JWT session cookie，Edge Runtime 兼容
const { auth } = NextAuth({
  providers: [],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

export { auth as middleware };

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login|register).*)"],
};
