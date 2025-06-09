import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Users, Trash2, Share, Calculator, Euro } from "lucide-react";

// Schemas
const createGroupSchema = z.object({
  name: z.string().min(1, "Il nome del gruppo è obbligatorio"),
  participants: z.array(z.string().min(1, "Nome obbligatorio")).min(2, "Servono almeno 2 partecipanti")
});

const expenseSchema = z.object({
  description: z.string().min(1, "Descrizione obbligatoria"),
  amount: z.number().min(0.01, "Importo deve essere maggiore di 0"),
  paidBy: z.string().min(1, "Seleziona chi ha pagato"),
  category: z.string().min(1, "Categoria obbligatoria"),
  date: z.string()
});

type CreateGroupForm = z.infer<typeof createGroupSchema>;
type ExpenseForm = z.infer<typeof expenseSchema>;

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

export default function SplittaBroMainPage() {
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [participants, setParticipants] = useState<string[]>(["", ""]);
  const { toast } = useToast();

  const groupForm = useForm<CreateGroupForm>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      participants: ["", ""]
    }
  });

  const expenseForm = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: 0,
      paidBy: "",
      category: "Cibo",
      date: new Date().toISOString().split('T')[0],
    },
  });

  // Carica gruppi
  const { data: groups = [] } = useQuery({
    queryKey: ['/api/expense-groups'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/expense-groups");
      return await response.json();
    }
  });

  // Carica spese del gruppo selezionato
  const { data: expenses = [] } = useQuery({
    queryKey: ['/api/expense-groups', selectedGroup, 'expenses'],
    queryFn: async () => {
      if (!selectedGroup) return [];
      const response = await apiRequest("GET", `/api/expense-groups/${selectedGroup}/expenses`);
      return await response.json();
    },
    enabled: !!selectedGroup
  });

  // Crea gruppo
  const createGroup = useMutation({
    mutationFn: async (data: CreateGroupForm) => {
      const validParticipants = data.participants.filter(p => p.trim() !== "");
      
      const groupData = {
        name: data.name.trim(),
        participants: validParticipants.map(name => ({ name: name.trim() })),
        tripId: 0
      };

      const response = await apiRequest("POST", "/api/expense-groups", groupData);
      return await response.json();
    },
    onSuccess: (group) => {
      setSelectedGroup(group.id);
      setShowCreateGroupDialog(false);
      groupForm.reset();
      setParticipants(["", ""]);
      toast({
        title: "Gruppo creato!",
        description: `Il gruppo "${group.name}" è stato creato.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/expense-groups'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: "Errore nella creazione del gruppo",
        variant: "destructive",
      });
    }
  });

  // Crea spesa
  const createExpense = useMutation({
    mutationFn: async (data: ExpenseForm) => {
      if (!selectedGroup) throw new Error("Nessun gruppo selezionato");
      
      const group = groups.find(g => g.id === selectedGroup);
      if (!group) throw new Error("Gruppo non trovato");

      const sharePerPerson = Math.round((data.amount * 100) / group.participants.length);
      const remainder = (data.amount * 100) - (sharePerPerson * group.participants.length);
      
      const splitWith = group.participants.map((participant, index) => ({
        name: participant.name,
        share: index === group.participants.length - 1 ? sharePerPerson + remainder : sharePerPerson
      }));

      const expenseData = {
        groupId: selectedGroup,
        description: data.description,
        amount: Math.round(data.amount * 100),
        paidBy: data.paidBy,
        splitWith,
        category: data.category,
        date: data.date
      };

      const response = await apiRequest("POST", "/api/expenses", expenseData);
      return await response.json();
    },
    onSuccess: () => {
      setShowExpenseDialog(false);
      expenseForm.reset();
      toast({
        title: "Spesa aggiunta!",
        description: "La spesa è stata registrata nel gruppo.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/expense-groups', selectedGroup, 'expenses'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: "Errore nell'aggiunta della spesa",
        variant: "destructive",
      });
    }
  });

  // Aggiungi partecipante
  const addParticipant = () => {
    setParticipants([...participants, ""]);
    groupForm.setValue("participants", [...participants, ""]);
  };

  // Rimuovi partecipante
  const removeParticipant = (index: number) => {
    if (participants.length > 2) {
      const updated = participants.filter((_, i) => i !== index);
      setParticipants(updated);
      groupForm.setValue("participants", updated);
    }
  };

  // Aggiorna partecipante
  const updateParticipant = (index: number, name: string) => {
    const updated = [...participants];
    updated[index] = name;
    setParticipants(updated);
    groupForm.setValue("participants", updated);
  };

  // Calcola bilanci
  const calculateBalances = () => {
    if (!selectedGroup) return [];
    
    const group = groups.find(g => g.id === selectedGroup);
    if (!group) return [];

    const balances: Record<string, { paid: number; owed: number; balance: number }> = {};
    
    // Inizializza bilanci
    group.participants.forEach(participant => {
      balances[participant.name] = { paid: 0, owed: 0, balance: 0 };
    });

    // Calcola totali
    expenses.forEach((expense: Expense) => {
      const paidBy = expense.paidBy;
      const amount = expense.amount;
      
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
    
    // Calcola bilancio finale
    Object.keys(balances).forEach(person => {
      if (balances[person]) {
        balances[person].balance = balances[person].paid - balances[person].owed;
      }
    });

    return Object.entries(balances).map(([name, balance]) => ({ name, ...balance }));
  };

  // Condividi gruppo
  const shareGroup = () => {
    if (!selectedGroup) return;
    
    const group = groups.find(g => g.id === selectedGroup);
    if (!group) return;

    const balances = calculateBalances();
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    let message = `🧾 *SplittaBro - ${group.name}*\n\n`;
    message += `💰 *Totale spese:* €${(totalAmount / 100).toFixed(2)}\n`;
    message += `👥 *Partecipanti:* ${group.participants.map(p => p.name).join(', ')}\n\n`;
    
    message += `*📊 Bilanci:*\n`;
    balances.forEach(balance => {
      const status = balance.balance > 0.01 ? '✅ In credito' : 
                    balance.balance < -0.01 ? '❌ Deve pagare' : '✅ In pari';
      message += `• ${balance.name}: €${(balance.balance / 100).toFixed(2)} ${status}\n`;
    });
    
    message += `\n🔗 Accedi al gruppo: ${window.location.href}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const formatAmount = (amount: number) => `€${(amount / 100).toFixed(2)}`;

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SplittaBro</h1>
          <p className="text-xl text-gray-600">Dividi le spese con i tuoi amici</p>
        </div>

        {/* Sezione gruppi */}
        {groups.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8" />
              </div>
              <CardTitle>Benvenuto in SplittaBro!</CardTitle>
              <CardDescription>
                Crea il tuo primo gruppo per iniziare a dividere le spese con i tuoi amici
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-red-600 hover:bg-red-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Crea il tuo primo gruppo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crea nuovo gruppo</DialogTitle>
                    <DialogDescription>
                      Aggiungi i tuoi amici per iniziare a dividere le spese
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={groupForm.handleSubmit((data) => createGroup.mutate(data))} className="space-y-4">
                    <div>
                      <Label>Nome del gruppo</Label>
                      <Input 
                        {...groupForm.register("name")} 
                        placeholder="es. Viaggio Amsterdam, Cena gruppo..."
                      />
                      {groupForm.formState.errors.name && (
                        <p className="text-red-500 text-sm mt-1">{groupForm.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label>Partecipanti</Label>
                      <div className="space-y-2">
                        {participants.map((participant, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={participant}
                              onChange={(e) => updateParticipant(index, e.target.value)}
                              placeholder={`Nome partecipante ${index + 1}`}
                            />
                            {participants.length > 2 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeParticipant(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addParticipant}
                        className="w-full mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi partecipante
                      </Button>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowCreateGroupDialog(false)}>
                        Annulla
                      </Button>
                      <Button type="submit" disabled={createGroup.isPending} className="bg-red-600 hover:bg-red-700">
                        {createGroup.isPending ? "Creando..." : "Crea gruppo"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Lista gruppi */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">I tuoi gruppi</CardTitle>
                  <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-red-600 hover:bg-red-700">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Crea nuovo gruppo</DialogTitle>
                        <DialogDescription>
                          Aggiungi i tuoi amici per iniziare a dividere le spese
                        </DialogDescription>
                      </DialogHeader>
                      
                      <form onSubmit={groupForm.handleSubmit((data) => createGroup.mutate(data))} className="space-y-4">
                        <div>
                          <Label>Nome del gruppo</Label>
                          <Input 
                            {...groupForm.register("name")} 
                            placeholder="es. Viaggio Amsterdam, Cena gruppo..."
                          />
                          {groupForm.formState.errors.name && (
                            <p className="text-red-500 text-sm mt-1">{groupForm.formState.errors.name.message}</p>
                          )}
                        </div>

                        <div>
                          <Label>Partecipanti</Label>
                          <div className="space-y-2">
                            {participants.map((participant, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  value={participant}
                                  onChange={(e) => updateParticipant(index, e.target.value)}
                                  placeholder={`Nome partecipante ${index + 1}`}
                                />
                                {participants.length > 2 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => removeParticipant(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={addParticipant}
                            className="w-full mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Aggiungi partecipante
                          </Button>
                        </div>

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setShowCreateGroupDialog(false)}>
                            Annulla
                          </Button>
                          <Button type="submit" disabled={createGroup.isPending} className="bg-red-600 hover:bg-red-700">
                            {createGroup.isPending ? "Creando..." : "Crea gruppo"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedGroup === group.id
                            ? "bg-red-100 border-2 border-red-300"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                        onClick={() => setSelectedGroup(group.id)}
                      >
                        <div className="font-medium text-sm">{group.name}</div>
                        <div className="text-xs text-gray-500">{group.participants.length} partecipanti</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contenuto gruppo selezionato */}
            {selectedGroup && selectedGroupData && (
              <div className="lg:col-span-3 space-y-6">
                {/* Header gruppo */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {selectedGroupData.name}
                      </CardTitle>
                      <CardDescription>
                        {selectedGroupData.participants.length} partecipanti • {expenses.length} spese
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={shareGroup}>
                        <Share className="h-4 w-4 mr-2" />
                        Condividi su WhatsApp
                      </Button>
                      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
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
                              Aggiungi una spesa al gruppo {selectedGroupData.name}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <form onSubmit={expenseForm.handleSubmit((data) => createExpense.mutate(data))} className="space-y-6">
                            <div className="space-y-4">
                              <div>
                                <Label className="text-base font-medium">Descrizione della spesa</Label>
                                <Input 
                                  {...expenseForm.register("description")} 
                                  placeholder="Inserisci descrizione (es. Cena al ristorante)" 
                                  className="text-lg"
                                />
                                {expenseForm.formState.errors.description && (
                                  <p className="text-red-500 text-sm mt-1">{expenseForm.formState.errors.description.message}</p>
                                )}
                              </div>

                              <div>
                                <Label className="text-base font-medium">Importo totale</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">€</span>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    {...expenseForm.register("amount", { valueAsNumber: true })} 
                                    placeholder="0.00"
                                    className="text-lg pl-8"
                                  />
                                </div>
                                {expenseForm.formState.errors.amount && (
                                  <p className="text-red-500 text-sm mt-1">{expenseForm.formState.errors.amount.message}</p>
                                )}
                              </div>
                            </div>

                            <div>
                              <Label className="text-base font-medium">Pagato da</Label>
                              <Select onValueChange={(value) => expenseForm.setValue("paidBy", value)}>
                                <SelectTrigger className="text-lg">
                                  <SelectValue placeholder="Seleziona chi ha pagato" />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectedGroupData.participants.map(p => (
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
                              {expenseForm.formState.errors.paidBy && (
                                <p className="text-red-500 text-sm mt-1">{expenseForm.formState.errors.paidBy.message}</p>
                              )}
                            </div>

                            <div>
                              <Label className="text-base font-medium">Come dividere la spesa?</Label>
                              <div className="mt-2 p-4 border rounded-lg bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm font-medium text-gray-700">Dividi equamente tra tutti</span>
                                  <span className="text-sm text-gray-500">
                                    {expenseForm.watch("amount") > 0 ? 
                                      `€${(expenseForm.watch("amount") / selectedGroupData.participants.length).toFixed(2)} a testa` : 
                                      '€0.00 a testa'
                                    }
                                  </span>
                                </div>
                                
                                <div className="space-y-2">
                                  {selectedGroupData.participants.map(p => (
                                    <div key={p.name} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                          {p.name.charAt(0)}
                                        </div>
                                        <span className="text-sm font-medium">{p.name}</span>
                                      </div>
                                      <span className="text-sm font-medium text-green-600">
                                        {expenseForm.watch("amount") > 0 ? 
                                          `€${(expenseForm.watch("amount") / selectedGroupData.participants.length).toFixed(2)}` : 
                                          '€0.00'
                                        }
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-base font-medium">Categoria</Label>
                                <Select onValueChange={(value) => expenseForm.setValue("category", value)} defaultValue="Cibo">
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
                                <Input type="date" {...expenseForm.register("date")} />
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
                    </div>
                  </CardHeader>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Lista spese */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Euro className="h-5 w-5" />
                          Spese del gruppo
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {expenses.length > 0 ? (
                          <div className="space-y-3">
                            {expenses.map((expense: Expense) => (
                              <div key={expense.id} className="p-4 border rounded-lg bg-white">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline">{expense.category}</Badge>
                                    <div>
                                      <div className="font-medium">{expense.description}</div>
                                      <div className="text-sm text-gray-500">
                                        Pagato da {expense.paidBy} • {new Date(expense.date).toLocaleDateString()}
                                      </div>
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

                  {/* Bilanci */}
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calculator className="h-5 w-5" />
                          Bilanci
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {calculateBalances().map((balance, index) => (
                            <div key={index} className={`flex items-center justify-between p-4 rounded-lg transition-all hover:shadow-md ${
                              balance.balance > 0.01
                                ? "bg-green-50 border border-green-200" 
                                : balance.balance < -0.01
                                  ? "bg-red-50 border border-red-200" 
                                  : "bg-gray-50 border border-gray-200"
                            }`}>
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                                  {balance.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-lg">{balance.name}</span>
                                  <div className="text-sm text-gray-500">
                                    Ha pagato {formatAmount(balance.paid)} • Deve {formatAmount(balance.owed)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-2xl font-bold ${
                                  balance.balance > 0.01
                                    ? "text-green-600" 
                                    : balance.balance < -0.01
                                      ? "text-red-600" 
                                      : "text-gray-600"
                                }`}>
                                  {balance.balance > 0.01 ? "+" : ""}{formatAmount(balance.balance)}
                                </div>
                                <div className={`text-sm font-medium ${
                                  balance.balance > 0.01
                                    ? "text-green-600" 
                                    : balance.balance < -0.01
                                      ? "text-red-600" 
                                      : "text-gray-600"
                                }`}>
                                  {balance.balance > 0.01 ? "In credito" : 
                                   balance.balance < -0.01 ? "Deve pagare" : "In pari"}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}