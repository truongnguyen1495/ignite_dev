"use client";

import { useRouter } from "next/navigation";
import { AvatarCropInput } from "@/components/ui/avatar-crop-input";
import { removeOwnAvatarAction } from "./actions";

export function AvatarSection({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const router = useRouter();

  return (
    <AvatarCropInput
      name={name}
      initialUrl={avatarUrl}
      onUploaded={() => router.refresh()}
      onRemove={async () => {
        const result = await removeOwnAvatarAction();
        router.refresh();
        return result;
      }}
    />
  );
}
