import type { Level, Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    grantedLevel: Level;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      grantedLevel: Level;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    grantedLevel: Level;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    grantedLevel: Level;
  }
}
