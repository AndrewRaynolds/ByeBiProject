import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Calculator, Euro, Users, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Schema validazione
const expenseSchema = z.object({
  description: z.string().min(1, "Descrizione richiesta"),
  amount: z.number().min(0.01, "Importo deve essere maggiore di 0"),
  paidBy: z.string().min(1, "Pagatore richiesto"),
  category: z.string().min(1, "Categoria richiesta"),
  date: z.string(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

// Tipi
interface Participant {
  name: string;
  email?: string;
}

interface ExpenseGroup {
  id: number;
  name: string;
  participants: Participant[];
  tripId: number;
  createdAt: string;
}

interface Expense {
  id: number;
  groupId: number;
  description: string;
  amount: number;
  paidBy: string;
  splitWith: { name: string; share: number }[];
  category: string;
  date: string;
  createdAt: string;
}

export default function SplittaBroTestPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);

  const form = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: 0,
      paidBy: "",
      category: "Cibo",
      date: new Date().toISOString().split('T')[0],
    }
  });

  // Crea gruppo demo
  const createDemoGroup = useMutation({
    mutationFn: async () => {
      const demoGroup = {
        name: "Test Gruppo Amsterdam",
        tripId: 0,
        participants: [
          { name: "Marco", email: "marco@test.com" },
          { name: "Luca", email: "luca@test.com" },
          { name: "Andrea", email: "andrea@test.com" },
          { name: "Paolo", email: "paolo@test.com" }
        ]
      };
      const response = await apiRequest('POST', '/api/expense-groups', demoGroup);
      return await response.json();
    },
    onSuccess: (group) => {
      setSelectedGroup(group.id);
      queryClient.invalidateQueries({ queryKey: ['/api/expense-groups'] });
      toast({
        title: "Gruppo creato",
        description: "Gruppo demo creato con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore nella creazione del gruppo",
        variant: "destructive",
      });
    }
  });

  // Ottieni gruppi
  const { data: groups = [], isLoading: loadingGroups } = useQuery<ExpenseGroup[]>({
    queryKey: ['/api/expense-groups'],
    staleTime: 30000
  });

  // Ottieni spese del gruppo selezionato
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery<Expense[]>({
    queryKey: ['/api/expense-groups', selectedGroup, 'expenses'],
    enabled: !!selectedGroup,
    staleTime: 10000
  });

  // Crea spesa
  const createExpense = useMutation({
    mutationFn: async (data: ExpenseForm) => {
      const group = groups.find(g => g.id === selectedGroup);
      if (!group) throw new Error("Gruppo non trovato");

      const amountInCents = Math.round(data.amount * 100);
      const sharePerPerson = Math.round(amountInCents / group.participants.length);
      
      const splitWith = group.participants.map((p, index) => ({
        name: p.name,
        share: index === 0 ? sharePerPerson + (amountInCents - sharePerPerson * group.participants.length) : sharePerPerson
      }));

      const expense = {
        ...data,
        amount: amountInCents,
        groupId: selectedGroup!,
        splitWith,
        date: new Date(data.date)
      };

      const response = await apiRequest('POST', '/api/expenses', expense);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-groups', selectedGroup, 'expenses'] });
      setShowExpenseDialog(false);
      form.reset();
      toast({
        title: "Spesa aggiunta",
        description: "Spesa registrata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Errore nell'aggiunta della spesa",
        variant: "destructive",
      });
    }
  });

  const deleteExpense = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-groups', selectedGroup, 'expenses'] });
      toast({
        title: "Spesa rimossa",
        description: "Spesa eliminata con successo",
      });
    }
  });

  // Imposta gruppo di default
  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(groups[0].id);
    }
  }, [groups, selectedGroup]);

  // Calcola totali
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const formatAmount = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  // Calcola bilanci
  const calculateBalances = () => {
    const group = groups.find(g => g.id === selectedGroup);
    if (!group) return [];

    const balances: Record<string, { paid: number; owed: number; balance: number }> = {};
    
    group.participants.forEach(p => {
      balances[p.name] = { paid: 0, owed: 0, balance: 0 };
    });

    expenses.forEach(expense => {
      balances[expense.paidBy].paid += expense.amount;
      expense.splitWith.forEach(split => {
        if (balances[split.name]) {
          balances[split.name].owed += split.share;
        }
      });
    });

    Object.keys(balances).forEach(name => {
      balances[name].balance = balances[name].paid - balances[name].owed;
    });

    return Object.entries(balances).map(([name, data]) => ({ name, ...data }));
  };

  const balances = calculateBalances();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Calculator className="h-8 w-8 text-red-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-black bg-clip-text text-transparent">
              SplittaBro Test
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Gestione spese condivise per il tuo gruppo</p>
        </div>

        {/* Controlli */}
        <div className="mb-6 flex flex-wrap gap-4 justify-center">
          {groups.length === 0 && (
            <Button 
              onClick={() => createDemoGroup.mutate()}
              disabled={createDemoGroup.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {createDemoGroup.isPending ? "Creando..." : "Crea Gruppo Demo"}
            </Button>
          )}

          {groups.length > 0 && (
            <Select value={selectedGroup?.toString()} onValueChange={(val) => setSelectedGroup(parseInt(val))}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Seleziona gruppo" />
              </SelectTrigger>
              <SelectContent>
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedGroup && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Statistiche */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Partecipanti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {groups.find(g => g.id === selectedGroup)?.participants.map(p => (
                    <div key={p.name} className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {p.name.charAt(0)}
                      </div>
                      <span>{p.name}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5" />
                    Bilanci
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {balances.map(balance => (
                    <div key={balance.name} className="flex justify-between items-center mb-2">
                      <span>{balance.name}</span>
                      <Badge variant={balance.balance >= 0 ? "default" : "destructive"}>
                        {formatAmount(balance.balance)}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Lista spese */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Spese del Gruppo</CardTitle>
                    <CardDescription>
                      Totale: {formatAmount(totalExpenses)} • {expenses.length} spese
                    </CardDescription>
                  </div>
                  
                  <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-red-600 hover:bg-red-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Spesa
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nuova Spesa</DialogTitle>
                        <DialogDescription>Aggiungi una nuova spesa al gruppo</DialogDescription>
                      </DialogHeader>
                      
                      <form onSubmit={form.handleSubmit((data) => createExpense.mutate(data))} className="space-y-6">
                        {/* Descrizione e Importo */}
                        <div className="space-y-4">
                          <div>
                            <Label className="text-base font-medium">Descrizione della spesa</Label>
                            <Input 
                              {...form.register("description")} 
                              placeholder="Inserisci descrizione (es. Cena al ristorante)" 
                              className="text-lg"
                            />
                            {form.formState.errors.description && (
                              <p className="text-red-500 text-sm mt-1">{form.formState.errors.description.message}</p>
                            )}
                          </div>

                          <div>
                            <Label className="text-base font-medium">Importo totale</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">€</span>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...form.register("amount", { valueAsNumber: true })} 
                                placeholder="0.00"
                                className="text-lg pl-8"
                              />
                            </div>
                            {form.formState.errors.amount && (
                              <p className="text-red-500 text-sm mt-1">{form.formState.errors.amount.message}</p>
                            )}
                          </div>
                        </div>

                        {/* Chi ha pagato */}
                        <div>
                          <Label className="text-base font-medium">Pagato da</Label>
                          <Select onValueChange={(value) => form.setValue("paidBy", value)}>
                            <SelectTrigger className="text-lg">
                              <SelectValue placeholder="Seleziona chi ha pagato" />
                            </SelectTrigger>
                            <SelectContent>
                              {groups.find(g => g.id === selectedGroup)?.participants.map(p => (
                                <SelectItem key={p.name} value={p.name}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                      {p.name.charAt(0)}
                                    </div>
                                    {p.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {form.formState.errors.paidBy && (
                            <p className="text-red-500 text-sm mt-1">{form.formState.errors.paidBy.message}</p>
                          )}
                        </div>

                        {/* Divisione spesa */}
                        <div>
                          <Label className="text-base font-medium">Come dividere la spesa?</Label>
                          <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-700">Dividi equamente tra tutti</span>
                              <span className="text-sm text-gray-500">
                                {form.watch("amount") > 0 && groups.find(g => g.id === selectedGroup) ? 
                                  `€${(form.watch("amount") / groups.find(g => g.id === selectedGroup)!.participants.length).toFixed(2)} a testa` : 
                                  '€0.00 a testa'
                                }
                              </span>
                            </div>
                            
                            <div className="space-y-2">
                              {groups.find(g => g.id === selectedGroup)?.participants.map(p => (
                                <div key={p.name} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                      {p.name.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium">{p.name}</span>
                                  </div>
                                  <span className="text-sm font-medium text-green-600">
                                    {form.watch("amount") > 0 ? 
                                      `€${(form.watch("amount") / groups.find(g => g.id === selectedGroup)!.participants.length).toFixed(2)}` : 
                                      '€0.00'
                                    }
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Categoria e Data */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-base font-medium">Categoria</Label>
                            <Select onValueChange={(value) => form.setValue("category", value)} defaultValue="Cibo">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Cibo">🍽️ Cibo & Ristoranti</SelectItem>
                                <SelectItem value="Trasporto">🚗 Trasporto</SelectItem>
                                <SelectItem value="Alloggio">🏨 Alloggio</SelectItem>
                                <SelectItem value="Attività">🎯 Attività & Divertimento</SelectItem>
                                <SelectItem value="Bevande">🍺 Bevande & Locali</SelectItem>
                                <SelectItem value="Shopping">🛍️ Shopping</SelectItem>
                                <SelectItem value="Altro">📝 Altro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-base font-medium">Data</Label>
                            <Input type="date" {...form.register("date")} />
                          </div>
                        </div>

                        <DialogFooter className="mt-6">
                          <Button type="button" variant="outline" onClick={() => setShowExpenseDialog(false)}>
                            Annulla
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createExpense.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {createExpense.isPending ? "Salvando..." : "Salva spesa"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>

                <CardContent>
                  {loadingExpenses ? (
                    <div className="text-center py-8">Caricamento spese...</div>
                  ) : expenses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>Nessuna spesa registrata</p>
                      <p className="text-sm">Aggiungi la prima spesa per iniziare</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {expenses.map(expense => (
                        <div key={expense.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{expense.description}</h4>
                              <p className="text-sm text-gray-600">
                                Pagato da {expense.paidBy} • {expense.category}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(expense.date).toLocaleDateString('it-IT')}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-600">
                                {formatAmount(expense.amount)}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteExpense.mutate(expense.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <Separator className="my-2" />
                          <div className="text-sm text-gray-600">
                            <strong>Divisione:</strong>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {expense.splitWith.map((split, idx) => (
                                <Badge key={idx} variant="outline">
                                  {split.name}: {formatAmount(split.share)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}