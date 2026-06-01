"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

export type FlashPayload = {
  variant: "success" | "error" | "info" | "warning";
  message: string;
};

type FlashToasterProps = {
  flashes: FlashPayload[];
};

export function FlashToaster({ flashes }: FlashToasterProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (flashes.length === 0) {
      return;
    }
    const search = window.location.search;
    const dedupeKey = `flash_toast:${pathname}${search}`;
    if (sessionStorage.getItem(dedupeKey)) {
      return;
    }
    sessionStorage.setItem(dedupeKey, "1");

    for (const flash of flashes) {
      if (flash.variant === "success") {
        toast.success(flash.message);
      } else if (flash.variant === "error") {
        toast.error(flash.message);
      } else if (flash.variant === "warning") {
        toast.warning(flash.message);
      } else {
        toast.message(flash.message);
      }
    }

    if (search.length > 0) {
      router.replace(pathname);
    }
  }, [flashes, pathname, router]);

  return null;
}
