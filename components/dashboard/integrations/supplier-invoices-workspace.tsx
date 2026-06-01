"use client";

import { useState } from "react";

import { SupplierInvoiceDropzone } from "@/components/dashboard/integrations/supplier-invoice-dropzone";
import { deleteSupplierInvoiceAction } from "@/app/dashboard/integrations/supplier-invoices/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SupplierInvoiceRow } from "@/lib/dashboard/supplier-invoices";
import { formatAmountCad, formatDisplayDate } from "@/lib/dashboard/document-format";

type SupplierInvoicesWorkspaceProps = {
  invoices: SupplierInvoiceRow[];
};

export function SupplierInvoicesWorkspace({ invoices }: SupplierInvoicesWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Achats fournisseur</CardTitle>
        <CardDescription>
          Les lignes extraites alimentent le coût matière et la vue profit par plat.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "history")}>
          <TabsList className="mb-4 w-full sm:w-auto">
            <TabsTrigger value="upload">Ajouter</TabsTrigger>
            <TabsTrigger value="history">Historique ({invoices.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="mt-0">
            <SupplierInvoiceDropzone />
          </TabsContent>
          <TabsContent value="history" className="mt-0">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune facture fournisseur.</p>
            ) : (
              <ul className="divide-y">
                {invoices.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="font-medium">{row.supplier_name ?? row.original_filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDisplayDate(row.invoice_date)} · {formatAmountCad(row.amount_total_cad)}
                      </p>
                    </div>
                    <form action={deleteSupplierInvoiceAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <Button type="submit" variant="outline" size="sm">
                        Supprimer
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
