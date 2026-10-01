import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTranslation } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function DeleteExpenseGroupButton({ group, onDeleted }: {
  group: { id: number; name: string; tripId?: number | null };
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  const deleteGroup = async () => {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      const response = await apiRequest("DELETE", `/api/expense-groups/${group.id}`);
      if (!response.ok) throw new Error("Delete failed");
      if (group.tripId) {
        void queryClient.invalidateQueries({ queryKey: [`/api/trips/${group.tripId}/expense-groups`] });
      }
      setOpen(false);
      toast({ title: t("splittabro.deleteGroupSuccess") });
      onDeleted();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  };

  return <AlertDialog open={open} onOpenChange={(next) => {
    if (!pending) { setOpen(next); setError(false); }
  }}>
    <AlertDialogTrigger asChild>
      <Button type="button" variant="destructive" className="min-h-11 w-full sm:w-auto" data-testid="button-delete-group">
        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />{t("splittabro.deleteGroup")}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("splittabro.deleteGroupTitle")}</AlertDialogTitle>
        <AlertDialogDescription>{t("splittabro.deleteGroupDescription", { name: group.name })}</AlertDialogDescription>
      </AlertDialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{t("splittabro.deleteGroupError")}</p>}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>{t("splittabro.deleteGroupCancel")}</AlertDialogCancel>
        <AlertDialogAction disabled={pending} aria-busy={pending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => {
          event.preventDefault();
          void deleteGroup();
        }}>{t("splittabro.deleteGroupConfirm")}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
