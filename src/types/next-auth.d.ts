import type { Level, Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    grantedLevel: Level | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      grantedLevel: Level | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    grantedLevel: Level | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    grantedLevel: Level | null;
  }
}
