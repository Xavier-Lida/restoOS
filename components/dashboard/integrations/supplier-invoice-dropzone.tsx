"use client";

import { unstable_rethrow } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Loader2Icon, UploadIcon } from "lucide-react";

import { uploadSupplierInvoiceAction } from "@/app/dashboard/integrations/supplier-invoices/actions";
import { Button } from "@/components/ui/button";
import {
  SUPPLIER_INVOICE_ALLOWED_MIME_TYPES,
  SUPPLIER_INVOICE_MAX_FILE_BYTES,
} from "@/lib/dashboard/supplier-invoices-constants";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";

export function SupplierInvoiceDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submitFile(file: File) {
    if (!SUPPLIER_INVOICE_ALLOWED_MIME_TYPES.has(file.type) && !file.name.match(/\.(pdf|png|jpe?g|webp)$/i)) {
      setError("Format non accepté.");
      return;
    }
    if (file.size > SUPPLIER_INVOICE_MAX_FILE_BYTES) {
      setError("Fichier trop volumineux.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("invoice", file);
    startTransition(async () => {
      try {
        await uploadSupplierInvoiceAction(formData);
      } catch (e) {
        unstable_rethrow(e);
        setError(e instanceof Error ? e.message : "Erreur d'envoi.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center",
          isPending && "opacity-60",
        )}
      >
        <UploadIcon className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">PDF ou image — facture fournisseur (achats matière)</p>
        <Button type="button" disabled={isPending} onClick={() => inputRef.current?.click()}>
          {isPending ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
          Choisir un fichier
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              submitFile(file);
            }
          }}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
