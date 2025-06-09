import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Trash2, Users, Calculator, Euro, Share2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Schema per il form di creazione spesa
const createExpenseSchema = z.object({
  description: z.string().min(1, "La descrizione è richiesta"),
  amount: z.number().min(0.01, "L'importo deve essere maggiore di 0"),
  paidBy: z.string().min(1, "Il pagatore è richiesto"),
  splitType: z.enum(["equal", "custom"]),
  splitWith: z.array(z.object({
    name: z.string(),
    share: z.number(),
  })).min(1, "È necessario dividere con almeno una persona"),
  category: z.string().min(1, "La categoria è richiesta"),
  groupId: z.number(),
  date: z.string(),
});

type CreateExpenseFormValues = z.infer<typeof createExpenseSchema>;

// Tipizzazione per i gruppi di spesa e le spese
interface ExpenseGroup {
  id: number;
  tripId: number;
  name: string;
  participants: { name: string; email?: string }[];
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

// Componente principale SplittaBro
export default function SplittaBroPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeGroup, setActiveGroup] = useState<number | null>(null);
  const [showNewExpenseDialog, setShowNewExpenseDialog] = useState(false);
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  
  // Query per ottenere i gruppi di spesa dal backend
  const { 
    data: expenseGroups,
    isLoading: isLoadingGroups,
    error: groupsError
  } = useQuery<ExpenseGroup[]>({ 
    queryKey: ['/api/expense-groups'],
    staleTime: 5000
  });
  
  // Query per ottenere le spese del gruppo attivo dal backend
  const { 
    data: expenses,
    isLoading: isLoadingExpenses,
    error: expensesError
  } = useQuery<Expense[]>({ 
    queryKey: ['/api/expense-groups', activeGroup, 'expenses'],
    enabled: !!activeGroup,
    staleTime: 2000
  });
  
  // Form per la creazione di una nuova spesa
  const expenseForm = useForm<CreateExpenseFormValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      description: "",
      amount: 0,
      paidBy: "",
      splitType: "equal",
      splitWith: [],
      category: "Cibo",
      groupId: activeGroup || 1,
      date: new Date().toISOString().split('T')[0],
    }
  });
  
  // Mutation per creare una nuova spesa
  const createExpense = useMutation({
    mutationFn: (data: CreateExpenseFormValues) => {
      return apiRequest('POST', '/api/expenses', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-groups', activeGroup, 'expenses'] });
      setShowNewExpenseDialog(false);
      toast({
        title: "Spesa aggiunta",
        description: "La spesa è stata aggiunta con successo",
      });
      expenseForm.reset();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiunta della spesa",
        variant: "destructive",
      });
    }
  });

  // Mutation per creare un gruppo di esempio
  const createDemoGroup = useMutation({
    mutationFn: async () => {
      const demoGroup = {
        name: "Addio al Celibato Marco - Amsterdam",
        tripId: 0,
        participants: [
          { name: "Marco (Sposo)", email: "marco@example.com" },
          { name: "Luca", email: "luca@example.com" },
          { name: "Andrea", email: "andrea@example.com" },
          { name: "Paolo", email: "paolo@example.com" },
          { name: "Giuseppe", email: "giuseppe@example.com" },
          { name: "Matteo", email: "matteo@example.com" }
        ]
      };
      const response = await apiRequest('POST', '/api/expense-groups', demoGroup);
      return await response.json();
    },
    onSuccess: async (newGroup) => {
      // Crea spese di esempio
      const demoExpenses = [
        {
          description: "Hotel The Student Hotel Amsterdam",
          amount: 48000, // 480.00 EUR in cents
          paidBy: "Luca",
          splitWith: [
            { name: "Marco (Sposo)", share: 8000 },
            { name: "Luca", share: 8000 },
            { name: "Andrea", share: 8000 },
            { name: "Paolo", share: 8000 },
            { name: "Giuseppe", share: 8000 },
            { name: "Matteo", share: 8000 }
          ],
          category: "Alloggio",
          groupId: newGroup.id,
          date: new Date("2025-06-15")
        },
        {
          description: "Voli Alitalia Milano-Amsterdam",
          amount: 114000, // 1140.00 EUR in cents
          paidBy: "Andrea",
          splitWith: [
            { name: "Marco (Sposo)", share: 19000 },
            { name: "Luca", share: 19000 },
            { name: "Andrea", share: 19000 },
            { name: "Paolo", share: 19000 },
            { name: "Giuseppe", share: 19000 },
            { name: "Matteo", share: 19000 }
          ],
          category: "Trasporto",
          groupId: newGroup.id,
          date: new Date("2025-06-15")
        },
        {
          description: "Cena REM Eiland",
          amount: 31550, // 315.50 EUR in cents
          paidBy: "Paolo",
          splitWith: [
            { name: "Marco (Sposo)", share: 5258 },
            { name: "Luca", share: 5258 },
            { name: "Andrea", share: 5258 },
            { name: "Paolo", share: 5258 },
            { name: "Giuseppe", share: 5258 },
            { name: "Matteo", share: 5260 }
          ],
          category: "Cibo",
          groupId: newGroup.id,
          date: new Date("2025-06-15")
        },
        {
          description: "Heineken Experience + Giro in barca",
          amount: 34800, // 348.00 EUR in cents
          paidBy: "Giuseppe",
          splitWith: [
            { name: "Marco (Sposo)", share: 5800 },
            { name: "Luca", share: 5800 },
            { name: "Andrea", share: 5800 },
            { name: "Paolo", share: 5800 },
            { name: "Giuseppe", share: 5800 },
            { name: "Matteo", share: 5800 }
          ],
          category: "Attività",
          groupId: newGroup.id,
          date: new Date("2025-06-16")
        },
        {
          description: "Serata al Red Light District",
          amount: 42000, // 420.00 EUR in cents
          paidBy: "Matteo",
          splitWith: [
            { name: "Marco (Sposo)", share: 0 },
            { name: "Luca", share: 8400 },
            { name: "Andrea", share: 8400 },
            { name: "Paolo", share: 8400 },
            { name: "Giuseppe", share: 8400 },
            { name: "Matteo", share: 8400 }
          ],
          category: "Bevande",
          groupId: newGroup.id,
          date: new Date("2025-06-16")
        }
      ];

      // Aggiungi tutte le spese di esempio
      for (const expense of demoExpenses) {
        await apiRequest('POST', '/api/expenses', expense);
      }

      setActiveGroup(newGroup.id);
      queryClient.invalidateQueries({ queryKey: ['/api/expense-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/expense-groups', newGroup.id, 'expenses'] });
      
      toast({
        title: "Gruppo demo creato",
        description: "È stato creato un gruppo di esempio con spese per testare SplittaBro",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione del gruppo demo",
        variant: "destructive",
      });
    }
  });
  
  // Imposta il gruppo attivo di default
  useEffect(() => {
    if (expenseGroups && expenseGroups.length > 0 && !activeGroup) {
      setActiveGroup(expenseGroups[0].id);
    }
  }, [expenseGroups, activeGroup]);
  
  // Aggiorna i partecipanti nel form quando cambia il gruppo attivo
  useEffect(() => {
    if (activeGroup && expenseGroups) {
      const group = expenseGroups.find(g => g.id === activeGroup);
      if (group) {
        const splitWith = group.participants.map(p => ({
          name: p.name,
          share: 0
        }));
        
        expenseForm.setValue('groupId', activeGroup);
        expenseForm.setValue('splitWith', splitWith);
        
        if (group.participants.length > 0) {
          expenseForm.setValue('paidBy', group.participants[0].name);
        }
      }
    }
  }, [activeGroup, expenseGroups, expenseForm]);
  
  // Gestione dell'invio del form per la spesa
  const onExpenseSubmit = (data: CreateExpenseFormValues) => {
    const group = expenseGroups?.find(g => g.id === activeGroup);
    if (!group) return;
    
    if (data.splitType === "equal") {
      // Divisione equa tra tutti i partecipanti
      const sharePerPerson = Math.round((data.amount / group.participants.length) * 100) / 100;
      const remainder = Math.round((data.amount - (sharePerPerson * group.participants.length)) * 100) / 100;
      
      const updatedSplitWith = group.participants.map((p, index) => ({
        name: p.name,
        share: index === 0 ? sharePerPerson + remainder : sharePerPerson
      }));
      
      data.splitWith = updatedSplitWith;
    }
    
    createExpense.mutate(data);
  };
  
  // Gestione del cambio tipo di divisione
  const handleSplitTypeChange = (type: "equal" | "custom") => {
    setSplitType(type);
    expenseForm.setValue('splitType', type);
    
    const group = expenseGroups?.find(g => g.id === activeGroup);
    if (!group) return;
    
    if (type === "equal") {
      const splitWith = group.participants.map(p => ({
        name: p.name,
        share: 0
      }));
      expenseForm.setValue('splitWith', splitWith);
    }
  };
  
  // Calcolo del bilancio per ogni partecipante
  const calculateBalances = () => {
    if (!expenses || !activeGroup || !expenseGroups) return [];
    
    const group = expenseGroups.find(g => g.id === activeGroup);
    if (!group || !group.participants || !Array.isArray(group.participants)) return [];
    
    const balances: Record<string, { paid: number; owed: number; balance: number }> = {};
    
    // Inizializza tutti i partecipanti
    group.participants.forEach(p => {
      if (p && p.name) {
        balances[p.name] = { paid: 0, owed: 0, balance: 0 };
      }
    });
    
    // Calcola pagamenti e debiti
    if (Array.isArray(expenses)) {
      expenses.forEach(expense => {
        if (!expense) return;
        
        const paidBy = expense.paidBy;
        const amount = expense.amount || 0;
        
        if (balances[paidBy]) {
          balances[paidBy].paid += amount;
        }
        
        if (expense.splitWith && Array.isArray(expense.splitWith)) {
          expense.splitWith.forEach(split => {
            if (split && split.name && balances[split.name]) {
              balances[split.name].owed += (split.share || 0);
            }
          });
        }
      });
    }
    
    // Calcola bilancio finale
    Object.keys(balances).forEach(person => {
      if (balances[person]) {
        balances[person].balance = balances[person].paid - balances[person].owed;
      }
    });
    
    return Object.entries(balances).map(([name, data]) => ({
      name,
      ...data
    }));
  };
  
  // Calcola i rimborsi ottimali
  const calculateSettlements = () => {
    const balances = calculateBalances();
    
    const positiveBalances = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const negativeBalances = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
    
    const settlements: { from: string; to: string; amount: number }[] = [];
    
    while (negativeBalances.length > 0 && positiveBalances.length > 0) {
      const debtor = negativeBalances[0];
      const creditor = positiveBalances[0];
      
      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
      
      if (amount > 0.01) {
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount: Math.round(amount * 100) / 100
        });
        
        debtor.balance += amount;
        creditor.balance -= amount;
      }
      
      if (Math.abs(debtor.balance) < 0.01) {
        negativeBalances.shift();
      }
      
      if (Math.abs(creditor.balance) < 0.01) {
        positiveBalances.shift();
      }
    }
    
    return settlements;
  };
  
  // Formattazione importi
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };
  
  // Calcola totale spese
  const getTotalExpenses = () => {
    return expenses?.reduce((total, expense) => total + expense.amount, 0) || 0;
  };
  
  // Categorie di spesa
  const expenseCategories = [
    "Alloggio", "Cibo", "Trasporto", "Attività", "Bevande", "Regali", "Altro"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Calculator className="h-8 w-8 text-red-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-black bg-clip-text text-transparent">
              SplittaBro
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Gestisci le spese condivise del tuo gruppo facilmente, come Splitwise e Tricount
          </p>
          {(!expenseGroups || expenseGroups.length === 0) && (
            <div className="mt-4 space-y-3">
              <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  Nessun gruppo trovato - Crea un gruppo demo per testare tutte le funzionalità!
                </span>
              </div>
              <div>
                <Button 
                  onClick={() => createDemoGroup.mutate()}
                  disabled={createDemoGroup.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {createDemoGroup.isPending ? "Creando..." : "Crea Gruppo Demo"}
                </Button>
              </div>
            </div>
          )}
          {expenseGroups && expenseGroups.length > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">
                Gruppo caricato - Prova tutte le funzionalità di SplittaBro!
              </span>
            </div>
          )}
        </div>

        {/* Statistiche rapide */}
        {expenseGroups && expenseGroups.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {expenseGroups.find(g => g.id === activeGroup)?.participants.length || 0}
                </div>
                <div className="text-sm text-gray-600">Partecipanti</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Euro className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {formatAmount(getTotalExpenses())}
                </div>
                <div className="text-sm text-gray-600">Totale spese</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Share2 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {expenses?.length || 0}
                </div>
                <div className="text-sm text-gray-600">Spese registrate</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Calculator className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {formatAmount(getTotalExpenses() / (expenseGroups.find(g => g.id === activeGroup)?.participants.length || 1))}
                </div>
                <div className="text-sm text-gray-600">Media per persona</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Contenuto principale */}
        {expenseGroups && expenseGroups.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista spese */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl">📋</span>
                    Spese del gruppo
                  </CardTitle>
                  <CardDescription>
                    {expenseGroups?.[0]?.name || "Gruppo di esempio"}
                  </CardDescription>
                </div>
                <Dialog open={showNewExpenseDialog} onOpenChange={setShowNewExpenseDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-red-600 hover:bg-red-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi spesa
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Nuova spesa</DialogTitle>
                      <DialogDescription>
                        Aggiungi una nuova spesa al gruppo
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...expenseForm}>
                      <form onSubmit={expenseForm.handleSubmit(onExpenseSubmit)} className="space-y-4">
                        <FormField
                          control={expenseForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descrizione</FormLabel>
                              <FormControl>
                                <Input placeholder="Es. Cena al ristorante" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={expenseForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Importo (€)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01" 
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={expenseForm.control}
                          name="paidBy"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pagato da</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleziona chi ha pagato" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {expenseGroups?.[0]?.participants.map((participant) => (
                                    <SelectItem key={participant.name} value={participant.name}>
                                      {participant.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={expenseForm.control}
                          name="category"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Categoria</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {expenseCategories.map((category) => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="space-y-3">
                          <Label>Come dividere la spesa?</Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={splitType === "equal" ? "default" : "outline"}
                              onClick={() => handleSplitTypeChange("equal")}
                              className="flex-1"
                            >
                              Dividi equamente
                            </Button>
                            <Button
                              type="button"
                              variant={splitType === "custom" ? "default" : "outline"}
                              onClick={() => handleSplitTypeChange("custom")}
                              className="flex-1"
                            >
                              Importi personalizzati
                            </Button>
                          </div>
                        </div>
                        
                        {splitType === "custom" && (
                          <div className="space-y-2">
                            <Label>Importi per persona</Label>
                            {expenseGroups?.[0]?.participants.map((participant, index) => (
                              <div key={participant.name} className="flex items-center gap-2">
                                <span className="text-sm min-w-[100px]">{participant.name}:</span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={expenseForm.watch(`splitWith.${index}.share`) || 0}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    expenseForm.setValue(`splitWith.${index}.share`, value);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setShowNewExpenseDialog(false)}>
                            Annulla
                          </Button>
                          <Button type="submit" disabled={createExpense.isPending}>
                            {createExpense.isPending ? "Aggiungendo..." : "Aggiungi spesa"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              
              <CardContent>
                {isLoadingExpenses ? (
                  <div className="text-center py-8 text-gray-500">Caricamento spese...</div>
                ) : expenses && expenses.length > 0 ? (
                  <div className="space-y-3">
                    {expenses.map((expense) => (
                      <div key={expense.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold">{expense.description}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <span>Pagato da: <span className="font-medium text-gray-900">{expense.paidBy}</span></span>
                              <Badge variant="outline">{expense.category}</Badge>
                              <span>{new Date(expense.date).toLocaleDateString('it-IT')}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              {formatAmount(expense.amount)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
                          {expense.splitWith && Array.isArray(expense.splitWith) ? expense.splitWith.map((split, index) => (
                            <div key={index} className="flex justify-between">
                              <span>{split.name}:</span>
                              <span className="font-medium">{formatAmount(split.share)}</span>
                            </div>
                          )) : (
                            <div className="text-gray-500">Nessuna divisione disponibile</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nessuna spesa registrata
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Bilancio e regolamenti */}
          <div className="space-y-6">
            {/* Bilancio partecipanti */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">💰</span>
                  Bilancio del gruppo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {calculateBalances().map((balance, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                      balance.balance > 0.01
                        ? "bg-green-50 border border-green-200" 
                        : balance.balance < -0.01
                          ? "bg-red-50 border border-red-200" 
                          : "bg-gray-50 border border-gray-200"
                    }`}>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{balance.name}</span>
                        <span className="text-xs text-gray-500">
                          Pagato: {formatAmount(balance.paid)}
                        </span>
                        <span className="text-xs text-gray-500">
                          Dovuto: {formatAmount(balance.owed)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${
                          balance.balance > 0.01
                            ? "text-green-600" 
                            : balance.balance < -0.01
                              ? "text-red-600" 
                              : "text-gray-600"
                        }`}>
                          {balance.balance > 0.01 ? "+" : ""}{formatAmount(balance.balance)}
                        </span>
                        <div className="text-xs text-gray-500">
                          {balance.balance > 0.01 ? "Da ricevere" : 
                           balance.balance < -0.01 ? "Da pagare" : "In pari"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Suggerimenti regolamento */}
            {calculateSettlements().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl">🔄</span>
                    Regolamento ottimale
                  </CardTitle>
                  <CardDescription>
                    Segui questi trasferimenti per pareggiare i conti
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {calculateSettlements().map((settlement, index) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-white">
                            {index + 1}
                          </Badge>
                          <div className="flex-1 text-sm">
                            <span className="font-medium text-red-600">{settlement.from}</span>
                            <span className="mx-2">deve dare</span>
                            <span className="font-bold text-green-600">{formatAmount(settlement.amount)}</span>
                            <span className="mx-2">a</span>
                            <span className="font-medium text-green-600">{settlement.to}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-700">
                      💡 <strong>Suggerimento:</strong> Dopo ogni trasferimento, il bilancio si aggiorna automaticamente. 
                      Segui l'ordine indicato per il regolamento più efficiente.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Partecipanti del gruppo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Partecipanti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expenseGroups?.find(g => g.id === activeGroup)?.participants.map((participant, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{participant.name}</div>
                        {participant.email && (
                          <div className="text-xs text-gray-500">{participant.email}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}