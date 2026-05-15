"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon, PencilIcon, Trash2Icon } from "lucide-react";

import { deleteMenuItemAction, updateMenuItemAction } from "@/app/onboarding/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { type MenuItemRecord } from "@/lib/onboarding/types";

type MenuItemRowProps = {
  item: MenuItemRecord;
};

export function MenuItemRow({ item }: MenuItemRowProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editPending, startEditTransition] = useTransition();
  const [deletePending, startDeleteTransition] = useTransition();

  return (
    <li className="rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">{item.item_name}</p>
            <p className="inline-flex w-fit rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              {item.category}
            </p>
          </div>
          <p className="rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-sm font-semibold text-primary">
            {Number(item.price_cad).toFixed(2)} $ CAD
          </p>
        </div>
        {item.notes ? (
          <p className="rounded-md bg-muted/50 px-2 py-1 text-sm text-muted-foreground">{item.notes}</p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <PencilIcon data-icon="inline-start" />
              Modifier
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Modifier le plat</SheetTitle>
              <SheetDescription>Mettez à jour les informations de ce plat.</SheetDescription>
            </SheetHeader>
            <form
              className="flex flex-col gap-3 px-4"
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                startEditTransition(async () => {
                  const fd = new FormData(form);
                  const result = await updateMenuItemAction(fd);
                  if (!result.ok) {
                    toast.error(result.message);
                    return;
                  }
                  if (result.message) {
                    toast.success(result.message);
                  }
                  setSheetOpen(false);
                  await router.refresh();
                });
              }}
            >
              <input type="hidden" name="item_id" value={item.id} />
              <div className="flex flex-col gap-2">
                <Label htmlFor={`item_name_${item.id}`}>Nom du plat</Label>
                <Input
                  id={`item_name_${item.id}`}
                  name="item_name"
                  required
                  defaultValue={item.item_name}
                  disabled={editPending}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`category_${item.id}`}>Catégorie</Label>
                <Input
                  id={`category_${item.id}`}
                  name="category"
                  required
                  defaultValue={item.category}
                  disabled={editPending}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`price_${item.id}`}>Prix (CAD)</Label>
                <Input
                  id={`price_${item.id}`}
                  name="price_cad"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={Number(item.price_cad).toFixed(2)}
                  disabled={editPending}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`notes_${item.id}`}>Notes</Label>
                <Textarea
                  id={`notes_${item.id}`}
                  name="notes"
                  defaultValue={item.notes ?? ""}
                  disabled={editPending}
                  rows={3}
                />
              </div>
              <SheetFooter className="px-0">
                <Button type="submit" disabled={editPending}>
                  {editPending ? (
                    <>
                      <Loader2Icon className="animate-spin" data-icon="inline-start" />
                      Enregistrement…
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={deletePending}>
              <Trash2Icon data-icon="inline-start" />
              Supprimer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Retirer ce plat ?</AlertDialogTitle>
              <AlertDialogDescription>
                « {item.item_name} » sera supprimé de votre menu. Vous pourrez l’ajouter à nouveau plus tard.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletePending}>Annuler</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={deletePending}
                onClick={() => {
                  startDeleteTransition(async () => {
                    const fd = new FormData();
                    fd.set("item_id", item.id);
                    const result = await deleteMenuItemAction(fd);
                    if (!result.ok) {
                      toast.error(result.message);
                      return;
                    }
                    if (result.message) {
                      toast.success(result.message);
                    }
                    setDeleteOpen(false);
                    await router.refresh();
                  });
                }}
              >
                {deletePending ? (
                  <>
                    <Loader2Icon className="animate-spin" data-icon="inline-start" />
                    Suppression…
                  </>
                ) : (
                  "Supprimer"
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}
