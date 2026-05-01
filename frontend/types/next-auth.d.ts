import { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      analysisCount: number;
      id: string;
      plan: "free" | "pro";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    analysisCount?: number;
    plan?: "free" | "pro";
    userId?: string;
  }
}
