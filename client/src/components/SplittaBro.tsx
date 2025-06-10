import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Users, Receipt, DollarSign, User, Trash2, Edit, Calculator, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface ExpenseGroup {
  id: number;
  name: string;
  description?: string;
  members: string[];
  totalAmount: number;
  currency: string;
  createdAt: string;
}

interface Expense {
  id: number;
  groupId: number;
  description: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
  category: string;
  date: string;
  receipt?: string;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

const createGroupSchema = z.object({
  name: z.string().min(1, 'Nome gruppo richiesto'),
  description: z.string().optional(),
  members: z.array(z.string()).min(1, 'Almeno un membro richiesto'),
});

const createExpenseSchema = z.object({
  description: z.string().min(1, 'Descrizione richiesta'),
  amount: z.number().min(0.01, 'Importo deve essere maggiore di 0'),
  paidBy: z.string().min(1, 'Chi ha pagato è richiesto'),
  splitBetween: z.array(z.string()).min(1, 'Seleziona almeno una persona'),
  category: z.string().min(1, 'Categoria richiesta'),
  date: z.string().min(1, 'Data richiesta'),
  splitEqually: z.boolean().optional(),
});

type CreateGroupFormValues = z.infer<typeof createGroupSchema>;
type CreateExpenseFormValues = z.infer<typeof createExpenseSchema>;

export function SplittaBro() {
  const [groups, setGroups] = useState<ExpenseGroup[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ExpenseGroup | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const groupForm = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      members: [],
    },
  });

  const [newMemberName, setNewMemberName] = useState('');

  const expenseForm = useForm<CreateExpenseFormValues>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      description: '',
      amount: 0,
      paidBy: '',
      splitBetween: [],
      category: 'food',
      date: new Date().toISOString().split('T')[0],
      splitEqually: false,
    },
  });

  // Carica i gruppi all'avvio
  useEffect(() => {
    loadGroups();
  }, []);

  // Carica le spese quando viene selezionato un gruppo
  useEffect(() => {
    if (selectedGroup) {
      loadExpenses(selectedGroup.id);
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      const response = await fetch('/api/expense-groups');
      if (response.ok) {
        const groupsData = await response.json();
        setGroups(groupsData);
      }
    } catch (error) {
      console.error('Errore caricamento gruppi:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExpenses = async (groupId: number) => {
    try {
      const response = await fetch(`/api/expense-groups/${groupId}/expenses`);
      if (response.ok) {
        const expensesData = await response.json();
        setExpenses(expensesData);
      }
    } catch (error) {
      console.error('Errore caricamento spese:', error);
    }
  };

  const onCreateGroup = async (data: CreateGroupFormValues) => {
    try {
      const response = await fetch('/api/expense-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          members: data.members,
          currency: 'EUR',
        }),
      });

      if (response.ok) {
        const newGroup = await response.json();
        setGroups(prev => [...prev, newGroup]);
        setShowCreateGroup(false);
        groupForm.reset({
          name: '',
          description: '',
          members: [],
        });
        setNewMemberName('');
        toast({
          title: "Gruppo creato!",
          description: "Il nuovo gruppo di spese è stato creato con successo.",
        });
      } else {
        throw new Error('Errore nella creazione del gruppo');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile creare il gruppo. Riprova.",
        variant: "destructive",
      });
    }
  };

  const addMember = () => {
    if (newMemberName.trim()) {
      const currentMembers = groupForm.getValues('members') || [];
      if (!currentMembers.includes(newMemberName.trim())) {
        groupForm.setValue('members', [...currentMembers, newMemberName.trim()]);
        setNewMemberName('');
      }
    }
  };

  const removeMember = (memberToRemove: string) => {
    const currentMembers = groupForm.getValues('members') || [];
    groupForm.setValue('members', currentMembers.filter(m => m !== memberToRemove));
  };

  const onCreateExpense = async (data: CreateExpenseFormValues) => {
    if (!selectedGroup) return;

    try {
      // Se è selezionato "dividi equamente", includi tutti i membri del gruppo
      const splitBetween = data.splitEqually ? selectedGroup.members : data.splitBetween;
      
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId: selectedGroup.id,
          description: data.description,
          amount: data.amount,
          paidBy: data.paidBy,
          splitBetween: splitBetween,
          category: data.category,
          date: data.date,
        }),
      });

      if (response.ok) {
        const newExpense = await response.json();
        setExpenses(prev => [...prev, newExpense]);
        setShowCreateExpense(false);
        expenseForm.reset({
          description: '',
          amount: 0,
          paidBy: '',
          splitBetween: [],
          category: 'food',
          date: new Date().toISOString().split('T')[0],
          splitEqually: false,
        });
        
        // Aggiorna il totale del gruppo
        const groupTotal = [...expenses, newExpense].reduce((sum, exp) => sum + exp.amount, 0);
        setGroups(prev => prev.map(g => 
          g.id === selectedGroup.id ? { ...g, totalAmount: groupTotal } : g
        ));
        
        toast({
          title: "Spesa aggiunta!",
          description: "La spesa è stata registrata con successo.",
        });
      } else {
        const errorData = await response.json();
        console.error('Errore validazione:', errorData);
        throw new Error('Errore nella creazione della spesa');
      }
    } catch (error) {
      console.error('Errore creazione spesa:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiungere la spesa. Riprova.",
        variant: "destructive",
      });
    }
  };

  const calculateSettlements = (group: ExpenseGroup, expenses: Expense[]): Settlement[] => {
    if (!group || expenses.length === 0) return [];

    const balances: { [member: string]: number } = {};
    
    // Inizializza i saldi a zero
    group.members.forEach(member => {
      balances[member] = 0;
    });

    // Calcola i saldi per ogni spesa
    expenses.forEach(expense => {
      const amountPerPerson = expense.amount / expense.splitBetween.length;
      
      // Chi ha pagato riceve credito
      balances[expense.paidBy] += expense.amount;
      
      // Chi deve dividere la spesa ha debito
      expense.splitBetween.forEach(member => {
        balances[member] -= amountPerPerson;
      });
    });

    // Calcola i regolamenti
    const settlements: Settlement[] = [];
    const creditors = Object.entries(balances).filter(([_, amount]) => amount > 0);
    const debtors = Object.entries(balances).filter(([_, amount]) => amount < 0);

    creditors.forEach(([creditor, creditAmount]) => {
      debtors.forEach(([debtor, debtAmount]) => {
        if (Math.abs(debtAmount) > 0.01 && creditAmount > 0.01) {
          const settlementAmount = Math.min(creditAmount, Math.abs(debtAmount));
          settlements.push({
            from: debtor,
            to: creditor,
            amount: settlementAmount,
          });
          
          balances[creditor] -= settlementAmount;
          balances[debtor] += settlementAmount;
        }
      });
    });

    return settlements.filter(s => s.amount > 0.01);
  };

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      food: '🍽️',
      transport: '🚗',
      accommodation: '🏨',
      entertainment: '🎉',
      shopping: '🛍️',
      other: '📋',
    };
    return icons[category] || '📋';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white">Caricamento SplittaBro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-600 mb-2">SplittaBro</h1>
          <p className="text-gray-300">Dividi le spese del tuo addio al celibato</p>
        </div>

        {!selectedGroup ? (
          /* Vista Gruppi */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">I tuoi gruppi</h2>
              <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                <DialogTrigger asChild>
                  <Button className="bg-red-600 hover:bg-red-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuovo Gruppo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-800 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">Crea Nuovo Gruppo</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Crea un nuovo gruppo per dividere le spese del tuo addio al celibato
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={groupForm.handleSubmit(onCreateGroup)} className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-white">Nome Gruppo</Label>
                      <Input
                        id="name"
                        {...groupForm.register('name')}
                        placeholder="es. Addio al Celibato Marco"
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                      {groupForm.formState.errors.name && (
                        <p className="text-red-500 text-sm mt-1">
                          {groupForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="description" className="text-white">Descrizione (opzionale)</Label>
                      <Textarea
                        id="description"
                        {...groupForm.register('description')}
                        placeholder="Descrizione del gruppo..."
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-white">Membri</Label>
                      <div className="space-y-2 mt-2">
                        <div className="flex gap-2">
                          <Input
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            placeholder="Nome del membro"
                            className="bg-gray-800 border-gray-700 text-white flex-1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addMember();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={addMember}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {groupForm.watch('members')?.map((member, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded border border-gray-700">
                              <span className="text-white text-sm">{member}</span>
                              <Button
                                type="button"
                                onClick={() => removeMember(member)}
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-600 hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        {groupForm.formState.errors.members && (
                          <p className="text-red-500 text-sm">
                            {groupForm.formState.errors.members.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button type="submit" className="bg-red-600 hover:bg-red-700">
                        Crea Gruppo
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {groups.length === 0 ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Nessun gruppo ancora</h3>
                  <p className="text-gray-400 mb-4">Crea il tuo primo gruppo per iniziare a dividere le spese!</p>
                  <Button
                    onClick={() => setShowCreateGroup(true)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crea il primo gruppo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    className="bg-gray-900 border-gray-800 hover:border-red-600 cursor-pointer transition-colors"
                    onClick={() => setSelectedGroup(group)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-white">{group.name}</CardTitle>
                          {group.description && (
                            <p className="text-gray-400 text-sm mt-1">{group.description}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          €{group.totalAmount.toFixed(2)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-gray-400 text-sm">
                        <Users className="h-4 w-4 mr-2" />
                        {group.members.length} membri
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {group.members.slice(0, 3).map((member) => (
                          <Badge key={member} variant="secondary" className="text-xs bg-gray-800 text-gray-300">
                            {member}
                          </Badge>
                        ))}
                        {group.members.length > 3 && (
                          <Badge variant="secondary" className="text-xs bg-gray-800 text-gray-300">
                            +{group.members.length - 3}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Vista Dettaglio Gruppo */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => setSelectedGroup(null)}
                  variant="outline"
                  className="border-gray-700 text-white hover:bg-gray-800"
                >
                  ← Torna ai gruppi
                </Button>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedGroup.name}</h2>
                  <p className="text-gray-400">Totale: €{selectedGroup.totalAmount.toFixed(2)}</p>
                </div>
              </div>
              <Dialog open={showCreateExpense} onOpenChange={setShowCreateExpense}>
                <DialogTrigger asChild>
                  <Button className="bg-red-600 hover:bg-red-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Spesa
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-800 text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">Aggiungi Nuova Spesa</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={expenseForm.handleSubmit(onCreateExpense)} className="space-y-4">
                    <div>
                      <Label htmlFor="description" className="text-white">Descrizione</Label>
                      <Input
                        id="description"
                        {...expenseForm.register('description')}
                        placeholder="es. Cena al ristorante"
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="amount" className="text-white">Importo (€)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        {...expenseForm.register('amount', { valueAsNumber: true })}
                        placeholder="0.00"
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="paidBy" className="text-white">Chi ha pagato</Label>
                      <Select onValueChange={(value) => expenseForm.setValue('paidBy', value)}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="Seleziona chi ha pagato" className="text-white" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          {selectedGroup.members.map((member) => (
                            <SelectItem key={member} value={member} className="text-white focus:text-white">
                              {member}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-white">Dividi tra</Label>
                      <div className="space-y-2 mt-2">
                        <label className="flex items-center space-x-2 text-white">
                          <input
                            type="checkbox"
                            {...expenseForm.register('splitEqually')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                expenseForm.setValue('splitBetween', selectedGroup.members);
                              } else {
                                expenseForm.setValue('splitBetween', []);
                              }
                            }}
                            className="rounded border-gray-600"
                          />
                          <span className="text-sm font-medium">Dividi equamente tra tutti</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedGroup.members.map((member) => (
                            <label key={member} className="flex items-center space-x-2 text-white">
                              <input
                                type="checkbox"
                                checked={expenseForm.watch('splitBetween')?.includes(member) || false}
                                onChange={(e) => {
                                  const currentSplit = expenseForm.getValues('splitBetween') || [];
                                  if (e.target.checked) {
                                    expenseForm.setValue('splitBetween', [...currentSplit, member]);
                                  } else {
                                    expenseForm.setValue('splitBetween', currentSplit.filter(m => m !== member));
                                    expenseForm.setValue('splitEqually', false);
                                  }
                                }}
                                className="rounded border-gray-600"
                              />
                              <span className="text-sm">{member}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="category" className="text-white">Categoria</Label>
                      <Select onValueChange={(value) => expenseForm.setValue('category', value)}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="Seleziona categoria" className="text-white" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="food" className="text-white focus:text-white">🍽️ Cibo</SelectItem>
                          <SelectItem value="transport" className="text-white focus:text-white">🚗 Trasporti</SelectItem>
                          <SelectItem value="accommodation" className="text-white focus:text-white">🏨 Alloggio</SelectItem>
                          <SelectItem value="entertainment" className="text-white focus:text-white">🎉 Divertimento</SelectItem>
                          <SelectItem value="shopping" className="text-white focus:text-white">🛍️ Shopping</SelectItem>
                          <SelectItem value="other" className="text-white focus:text-white">📋 Altro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="date" className="text-white">Data</Label>
                      <Input
                        id="date"
                        type="date"
                        {...expenseForm.register('date')}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button type="submit" className="bg-red-600 hover:bg-red-700">
                        Aggiungi Spesa
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Lista Spese */}
              <div className="lg:col-span-2">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Receipt className="h-5 w-5 mr-2" />
                      Spese ({expenses.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {expenses.length === 0 ? (
                      <div className="text-center py-8">
                        <Receipt className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400">Nessuna spesa ancora registrata</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-3">
                          {expenses.map((expense) => (
                            <div
                              key={expense.id}
                              className="p-4 bg-gray-800 rounded-lg border border-gray-700"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">
                                    {getCategoryIcon(expense.category)}
                                  </span>
                                  <div>
                                    <h4 className="font-semibold text-white">{expense.description}</h4>
                                    <p className="text-sm text-gray-400">
                                      Pagato da {expense.paidBy}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-red-600">€{expense.amount.toFixed(2)}</p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(expense.date).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs text-gray-400">Diviso tra:</span>
                                {expense.splitBetween.map((member) => (
                                  <Badge key={member} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                                    {member}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Regolamenti */}
              <div>
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Calculator className="h-5 w-5 mr-2" />
                      Regolamenti
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const settlements = calculateSettlements(selectedGroup, expenses);
                      return settlements.length === 0 ? (
                        <div className="text-center py-8">
                          <DollarSign className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                          <p className="text-gray-400">Tutti i conti sono in pari!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {settlements.map((settlement, index) => (
                            <div
                              key={index}
                              className="p-3 bg-gray-800 rounded-lg border border-gray-700"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4 text-gray-400" />
                                  <span className="text-white font-medium">{settlement.from}</span>
                                  <ArrowRight className="h-4 w-4 text-gray-400" />
                                  <span className="text-white font-medium">{settlement.to}</span>
                                </div>
                                <span className="font-bold text-red-600">
                                  €{settlement.amount.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Membri del gruppo */}
                <Card className="bg-gray-900 border-gray-800 mt-6">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Membri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedGroup.members.map((member) => (
                        <div
                          key={member}
                          className="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-700"
                        >
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-white">{member}</span>
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
    </div>
  );
}