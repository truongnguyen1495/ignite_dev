import type { Level, Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// credentialFingerprint is optional everywhere on purpose: tokens issued
// before it existed simply don't carry one, and the checks in src/lib/access.ts
// let those through rather than signing the whole userbase out mid-session.
// session.maxAge is 30 minutes, so the last of them is gone within half an
// hour of a deploy. See src/lib/session-fingerprint.ts.
declare module "next-auth" {
  interface User {
    role: Role;
    grantedLevel: Level;
    credentialFingerprint?: string;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      grantedLevel: Level;
      credentialFingerprint?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    grantedLevel: Level;
    credentialFingerprint?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    grantedLevel: Level;
    credentialFingerprint?: string;
  }
}
