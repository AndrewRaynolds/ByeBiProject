import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
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
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Schema per il form di creazione gruppo
const createGroupSchema = z.object({
  name: z.string().min(1, "Il nome del gruppo è richiesto"),
  tripId: z.number(),
  participants: z.array(z.object({
    name: z.string(),
    email: z.string().email().optional(),
  })).min(1, "È necessario almeno un partecipante"),
});

// Schema per il form di creazione spesa
const createExpenseSchema = z.object({
  description: z.string().min(1, "La descrizione è richiesta"),
  amount: z.number().min(1, "L'importo deve essere maggiore di 0"),
  paidBy: z.string().min(1, "Il pagatore è richiesto"),
  splitWith: z.array(z.object({
    name: z.string(),
    share: z.number(),
  })).min(1, "È necessario dividere con almeno una persona"),
  category: z.string().min(1, "La categoria è richiesta"),
  groupId: z.number(),
  date: z.date(),
});

type CreateGroupFormValues = z.infer<typeof createGroupSchema>;
type CreateExpenseFormValues = z.infer<typeof createExpenseSchema>;

// Componente per l'interfaccia SplittaBro
export default function SplittaBroPage() {
  const [_, setLocation] = useLocation();
  const params = useParams();
  const tripId = params?.tripId ? parseInt(params.tripId) : null;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeGroup, setActiveGroup] = useState<number | null>(null);
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
  const [showNewExpenseDialog, setShowNewExpenseDialog] = useState(false);
  const [participants, setParticipants] = useState<{ name: string; email?: string }[]>([{ name: "" }]);
  
  // Query per ottenere i gruppi di spesa
  const { 
    data: expenseGroups,
    isLoading: isLoadingGroups, 
    error: groupsError 
  } = useQuery({ 
    queryKey: ['/api/trips', tripId, 'expense-groups'],
    enabled: !!tripId,
    staleTime: 5000
  });
  
  // Query per ottenere le spese del gruppo attivo
  const { 
    data: expenses,
    isLoading: isLoadingExpenses, 
    error: expensesError 
  } = useQuery({ 
    queryKey: ['/api/expense-groups', activeGroup, 'expenses'],
    enabled: !!activeGroup,
    staleTime: 2000
  });
  
  // Form per la creazione di un nuovo gruppo
  const groupForm = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      tripId: tripId || 0,
      participants: [{ name: "" }]
    }
  });
  
  // Form per la creazione di una nuova spesa
  const expenseForm = useForm<CreateExpenseFormValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      description: "",
      amount: 0,
      paidBy: "",
      splitWith: [],
      category: "Alloggio",
      groupId: activeGroup || 0,
      date: new Date(),
    }
  });
  
  // Mutation per creare un nuovo gruppo
  const createGroup = useMutation({
    mutationFn: (data: CreateGroupFormValues) => {
      return apiRequest('/api/expense-groups', {
        method: 'POST',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'expense-groups'] });
      setShowNewGroupDialog(false);
      toast({
        title: "Gruppo creato",
        description: "Il gruppo di spese è stato creato con successo",
      });
      groupForm.reset();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione del gruppo",
        variant: "destructive",
      });
    }
  });
  
  // Mutation per creare una nuova spesa
  const createExpense = useMutation({
    mutationFn: (data: CreateExpenseFormValues) => {
      return apiRequest('/api/expenses', {
        method: 'POST',
        data
      });
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
  
  // Mutation per eliminare una spesa
  const deleteExpense = useMutation({
    mutationFn: (expenseId: number) => {
      return apiRequest(`/api/expenses/${expenseId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expense-groups', activeGroup, 'expenses'] });
      toast({
        title: "Spesa eliminata",
        description: "La spesa è stata eliminata con successo",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'eliminazione della spesa",
        variant: "destructive",
      });
    }
  });
  
  // Aggiornamento del gruppo attivo quando i gruppi vengono caricati
  useEffect(() => {
    if (expenseGroups && expenseGroups.length > 0 && !activeGroup) {
      setActiveGroup(expenseGroups[0].id);
    }
  }, [expenseGroups, activeGroup]);
  
  // Aggiornamento dei partecipanti nel form delle spese
  useEffect(() => {
    if (activeGroup && expenseGroups) {
      const group = expenseGroups.find(g => g.id === activeGroup);
      if (group) {
        const splitWith = group.participants.map((p: { name: string }) => ({
          name: p.name,
          share: 0
        }));
        
        expenseForm.setValue('groupId', activeGroup);
        expenseForm.setValue('splitWith', splitWith);
        
        // Imposta un pagatore predefinito
        if (group.participants.length > 0) {
          expenseForm.setValue('paidBy', group.participants[0].name);
        }
      }
    }
  }, [activeGroup, expenseGroups, expenseForm]);
  
  // Gestione dell'invio del form per il gruppo
  const onGroupSubmit = (data: CreateGroupFormValues) => {
    // Filtra partecipanti vuoti
    const filteredParticipants = data.participants.filter(p => p.name.trim() !== '');
    if (filteredParticipants.length === 0) {
      toast({
        title: "Errore",
        description: "Aggiungi almeno un partecipante",
        variant: "destructive",
      });
      return;
    }
    
    createGroup.mutate({
      ...data,
      participants: filteredParticipants
    });
  };
  
  // Gestione dell'invio del form per la spesa
  const onExpenseSubmit = (data: CreateExpenseFormValues) => {
    // Calcolo automatico delle quote se tutte a 0
    const allZero = data.splitWith.every(sw => sw.share === 0);
    if (allZero) {
      const evenShare = Math.round((data.amount / data.splitWith.length) * 100) / 100;
      const updatedSplitWith = data.splitWith.map(sw => ({
        ...sw,
        share: evenShare
      }));
      data.splitWith = updatedSplitWith;
    }
    
    createExpense.mutate(data);
  };
  
  // Aggiunta di un nuovo partecipante al form del gruppo
  const addParticipant = () => {
    const currentParticipants = groupForm.getValues('participants') || [];
    groupForm.setValue('participants', [...currentParticipants, { name: '' }]);
    setParticipants([...participants, { name: '' }]);
  };
  
  // Rimozione di un partecipante dal form del gruppo
  const removeParticipant = (index: number) => {
    const currentParticipants = [...participants];
    currentParticipants.splice(index, 1);
    setParticipants(currentParticipants);
    groupForm.setValue('participants', currentParticipants);
  };
  
  // Calcolo del bilancio per ogni partecipante
  const calculateBalances = () => {
    if (!expenses || !activeGroup || !expenseGroups) return [];
    
    const group = expenseGroups.find(g => g.id === activeGroup);
    if (!group) return [];
    
    // Crea oggetto per tenere traccia di quanto ognuno ha pagato e dovuto
    const balances: Record<string, { paid: number; owed: number; balance: number }> = {};
    
    // Inizializza tutti i partecipanti con 0
    group.participants.forEach((p: { name: string }) => {
      balances[p.name] = { paid: 0, owed: 0, balance: 0 };
    });
    
    // Calcola quanto ognuno ha pagato e quanto deve
    expenses.forEach((expense: any) => {
      const paidBy = expense.paidBy;
      const amount = expense.amount;
      
      // Aggiunge l'importo pagato alla persona che ha pagato
      if (balances[paidBy]) {
        balances[paidBy].paid += amount;
      }
      
      // Distribuisce l'importo dovuto tra i partecipanti
      expense.splitWith.forEach((split: { name: string; share: number }) => {
        if (balances[split.name]) {
          balances[split.name].owed += split.share;
        }
      });
    });
    
    // Calcola il bilancio finale (pagato - dovuto)
    Object.keys(balances).forEach(person => {
      balances[person].balance = balances[person].paid - balances[person].owed;
    });
    
    return Object.entries(balances).map(([name, data]) => ({
      name,
      ...data
    }));
  };
  
  // Formattazione di un importo in EUR
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
  };
  
  // Rendering del bilancio complessivo
  const renderBalances = () => {
    const balances = calculateBalances();
    
    return (
      <div className="space-y-4 mt-6">
        <h3 className="font-bold text-lg">Bilancio del gruppo</h3>
        <div className="grid grid-cols-1 gap-2">
          {balances.map((balance, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-black bg-opacity-5 rounded-lg">
              <span className="font-medium">{balance.name}</span>
              <span className={
                balance.balance > 0 
                  ? "font-bold text-green-500" 
                  : balance.balance < 0 
                    ? "font-bold text-red-500" 
                    : ""
              }>
                {formatAmount(balance.balance)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Categorie di spesa
  const expenseCategories = [
    "Alloggio", "Cibo", "Trasporto", "Attività", "Bevande", "Regali", "Altro"
  ];

  if (!tripId) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Errore</CardTitle>
            <CardDescription>Nessun viaggio selezionato</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Seleziona un viaggio per gestire le spese di gruppo.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => setLocation('/dashboard')}>Torna alla dashboard</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (isLoadingGroups) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p>Caricamento gruppi di spesa...</p>
      </div>
    );
  }
  
  if (groupsError) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Errore
            </CardTitle>
            <CardDescription>Impossibile caricare i gruppi di spesa</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Si è verificato un errore durante il caricamento dei gruppi di spesa.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/trips', tripId, 'expense-groups'] })}>
              Riprova
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">SplittaBro</h1>
          <p className="text-gray-600">Gestisci e dividi le spese con gli amici durante il tuo addio al celibato</p>
        </div>
        <Button 
          onClick={() => setShowNewGroupDialog(true)}
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Nuovo gruppo
        </Button>
      </div>
      
      {(!expenseGroups || expenseGroups.length === 0) ? (
        <Card>
          <CardHeader>
            <CardTitle>Nessun gruppo di spesa</CardTitle>
            <CardDescription>Non ci sono ancora gruppi di spesa per questo viaggio</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Crea un nuovo gruppo di spesa per iniziare a tracciare le spese con gli amici.</p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => setShowNewGroupDialog(true)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Plus className="mr-2 h-4 w-4" /> Nuovo gruppo
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>I tuoi gruppi</CardTitle>
                <CardDescription>Gestisci gruppi di spesa</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {expenseGroups.map((group: any) => (
                  <div 
                    key={group.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      activeGroup === group.id 
                        ? 'bg-red-600 text-white' 
                        : 'bg-black bg-opacity-5 hover:bg-black hover:bg-opacity-10'
                    }`}
                    onClick={() => setActiveGroup(group.id)}
                  >
                    <h3 className="font-bold">{group.name}</h3>
                    <p className="text-sm opacity-80">
                      {group.participants?.length || 0} partecipanti
                    </p>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => setShowNewGroupDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Nuovo gruppo
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            {activeGroup && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <div>
                    <CardTitle>
                      {expenseGroups?.find((g: any) => g.id === activeGroup)?.name || 'Gruppo'}
                    </CardTitle>
                    <CardDescription>
                      {expenseGroups?.find((g: any) => g.id === activeGroup)?.participants?.length || 0} partecipanti
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => {
                      setShowNewExpenseDialog(true);
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Nuova spesa
                  </Button>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="expenses">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="expenses">Spese</TabsTrigger>
                      <TabsTrigger value="balance">Bilancio</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="expenses">
                      {isLoadingExpenses ? (
                        <p className="text-center py-4">Caricamento spese...</p>
                      ) : expensesError ? (
                        <div className="text-center py-4">
                          <p className="text-red-500">Errore nel caricamento delle spese</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/expense-groups', activeGroup, 'expenses'] })}
                          >
                            Riprova
                          </Button>
                        </div>
                      ) : !expenses || expenses.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="mb-4">Nessuna spesa registrata</p>
                          <Button 
                            onClick={() => setShowNewExpenseDialog(true)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Plus className="mr-2 h-4 w-4" /> Aggiungi una spesa
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {expenses.map((expense: any) => (
                            <div key={expense.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-bold">{expense.description}</h3>
                                  <p className="text-sm text-gray-500">
                                    Pagato da {expense.paidBy} • {new Date(expense.date).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-red-100 hover:bg-red-200 border-red-200">
                                    {expense.category}
                                  </Badge>
                                  <span className="font-bold">{formatAmount(expense.amount)}</span>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => deleteExpense.mutate(expense.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                              
                              <Separator className="my-3" />
                              
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {expense.splitWith.map((split: any, idx: number) => (
                                  <div key={idx} className="text-sm">
                                    <span className="font-medium">{split.name}</span>: {formatAmount(split.share)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="balance">
                      {renderBalances()}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
      
      {/* Dialog per la creazione di un nuovo gruppo */}
      <Dialog open={showNewGroupDialog} onOpenChange={setShowNewGroupDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crea un nuovo gruppo</DialogTitle>
            <DialogDescription>
              Aggiungi un nuovo gruppo per gestire le spese con i tuoi amici.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...groupForm}>
            <form onSubmit={groupForm.handleSubmit(onGroupSubmit)} className="space-y-4">
              <FormField
                control={groupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome del gruppo</FormLabel>
                    <FormControl>
                      <Input placeholder="es. Viaggio a Praga" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <Label>Partecipanti</Label>
                <div className="space-y-2 mt-1.5">
                  {participants.map((_, index) => (
                    <div key={index} className="flex gap-2">
                      <FormField
                        control={groupForm.control}
                        name={`participants.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="flex-1 space-y-0">
                            <FormControl>
                              <Input placeholder="Nome partecipante" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {participants.length > 1 && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeParticipant(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={addParticipant}
                >
                  <Plus className="mr-2 h-3 w-3" /> Aggiungi partecipante
                </Button>
              </div>
              
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewGroupDialog(false)}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit"
                  className="bg-red-600 hover:bg-red-700"
                  disabled={createGroup.isPending}
                >
                  {createGroup.isPending ? "Creazione..." : "Crea gruppo"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Dialog per la creazione di una nuova spesa */}
      <Dialog open={showNewExpenseDialog} onOpenChange={setShowNewExpenseDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Aggiungi una spesa</DialogTitle>
            <DialogDescription>
              Registra una nuova spesa nel gruppo.
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
                      <Input placeholder="es. Cena al ristorante" {...field} />
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
                        min="0"
                        placeholder="0.00" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={expenseForm.control}
                  name="paidBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pagato da</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona pagatore" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeGroup && expenseGroups && expenseGroups.find(g => g.id === activeGroup)?.participants.map((p: any, i: number) => (
                            <SelectItem key={i} value={p.name}>{p.name}</SelectItem>
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
                            <SelectValue placeholder="Seleziona categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {expenseCategories.map((category, i) => (
                            <SelectItem key={i} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div>
                <Label>Divisione della spesa</Label>
                <FormDescription>
                  Lascia tutto a zero per dividere equamente
                </FormDescription>
                <div className="space-y-2 mt-1.5">
                  {expenseForm.getValues('splitWith').map((_, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <FormField
                        control={expenseForm.control}
                        name={`splitWith.${index}.name`}
                        render={({ field }) => (
                          <div className="flex-1">
                            {field.value}
                          </div>
                        )}
                      />
                      <FormField
                        control={expenseForm.control}
                        name={`splitWith.${index}.share`}
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0"
                                placeholder="0.00" 
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowNewExpenseDialog(false)}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit"
                  className="bg-red-600 hover:bg-red-700"
                  disabled={createExpense.isPending}
                >
                  {createExpense.isPending ? "Salvataggio..." : "Salva spesa"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}