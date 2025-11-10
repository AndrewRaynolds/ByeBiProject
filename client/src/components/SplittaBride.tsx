import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
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
import { Plus, Users, Receipt, DollarSign, User, Trash2, Edit, Calculator, ArrowRight, TrendingUp, Sparkles } from 'lucide-react';
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

export function SplittaBride() {
  const [groups, setGroups] = useState<ExpenseGroup[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ExpenseGroup | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [location, navigate] = useLocation();

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

  useEffect(() => {
    loadGroups();
  }, []);

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
      const splitBetween = data.splitEqually ? selectedGroup.members : data.splitBetween;
      
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId: selectedGroup.id,
          description: data.description,
          amount: Math.round(data.amount * 100),
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
        
        const groupTotal = [...expenses, newExpense].reduce((sum, exp) => sum + exp.amount, 0) / 100;
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
    
    group.members.forEach(member => {
      balances[member] = 0;
    });

    expenses.forEach(expense => {
      const amountPerPerson = expense.amount / expense.splitBetween.length;
      balances[expense.paidBy] += expense.amount;
      expense.splitBetween.forEach(member => {
        balances[member] -= amountPerPerson;
      });
    });

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
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-pink-600/30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-pink-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-white text-lg">Caricamento SplittaBride...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <button
            onClick={() => navigate('/')}
            className="font-poppins font-bold text-xl md:text-2xl transform transition-transform hover:scale-105 cursor-pointer"
            data-testid="button-home"
          >
            <span className="text-white">Bye</span><span className="text-pink-600">Bride</span>
          </button>
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Sparkles className="w-8 h-8 text-pink-500" />
              <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-pink-500 via-pink-600 to-pink-500 bg-clip-text text-transparent">
                SplittaBride
              </h1>
              <Sparkles className="w-8 h-8 text-pink-500" />
            </div>
            <p className="text-gray-400 text-sm md:text-base">Dividi le spese del tuo addio al nubilato</p>
          </div>
          <div className="w-20 hidden md:block"></div>
        </div>

        {!selectedGroup ? (
          /* Vista Gruppi */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                I tuoi gruppi
              </h2>
              <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white shadow-lg shadow-pink-500/30 w-full sm:w-auto"
                    data-testid="button-create-group"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuovo Gruppo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gradient-to-br from-gray-900 to-black border border-pink-500/20 text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white text-xl">Crea Nuovo Gruppo</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Crea un nuovo gruppo per dividere le spese del tuo addio al nubilato
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={groupForm.handleSubmit(onCreateGroup)} className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-white">Nome Gruppo</Label>
                      <Input
                        id="name"
                        {...groupForm.register('name')}
                        placeholder="es. Addio al Nubilato Sara"
                        className="bg-gray-800/50 border-gray-700 text-white mt-1"
                        data-testid="input-group-name"
                      />
                      {groupForm.formState.errors.name && (
                        <p className="text-pink-400 text-sm mt-1">
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
                        className="bg-gray-800/50 border-gray-700 text-white mt-1"
                        data-testid="input-group-description"
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
                            className="bg-gray-800/50 border-gray-700 text-white flex-1"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addMember();
                              }
                            }}
                            data-testid="input-member-name"
                          />
                          <Button
                            type="button"
                            onClick={addMember}
                            className="bg-pink-600 hover:bg-pink-700"
                            data-testid="button-add-member"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <ScrollArea className="max-h-32">
                          <div className="space-y-1">
                            {groupForm.watch('members')?.map((member, index) => (
                              <div 
                                key={index} 
                                className="flex items-center justify-between bg-gradient-to-r from-pink-500/10 to-pink-600/10 px-3 py-2 rounded-lg border border-pink-500/30"
                                data-testid={`member-${index}`}
                              >
                                <span className="text-white text-sm font-medium">{member}</span>
                                <Button
                                  type="button"
                                  onClick={() => removeMember(member)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-pink-400 hover:text-pink-300 hover:bg-pink-900/20 h-8 w-8 p-0"
                                  data-testid={`button-remove-member-${index}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        {groupForm.formState.errors.members && (
                          <p className="text-pink-400 text-sm">
                            {groupForm.formState.errors.members.message}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 w-full"
                        data-testid="button-submit-group"
                      >
                        Crea Gruppo
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {groups.length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-pink-500/20 backdrop-blur-sm">
                <CardContent className="text-center py-16">
                  <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-10 w-10 text-pink-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Nessun gruppo ancora</h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">Crea il tuo primo gruppo per iniziare a dividere le spese del tuo addio al nubilato!</p>
                  <Button
                    onClick={() => setShowCreateGroup(true)}
                    className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 shadow-lg shadow-pink-500/30"
                    data-testid="button-create-first-group"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crea il primo gruppo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 hover:border-pink-500 cursor-pointer transition-all hover:shadow-xl hover:shadow-pink-500/20 backdrop-blur-sm group"
                    onClick={() => setSelectedGroup(group)}
                    data-testid={`group-card-${group.id}`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-white text-lg mb-1 group-hover:text-pink-400 transition-colors">
                            {group.name}
                          </CardTitle>
                          {group.description && (
                            <p className="text-gray-400 text-sm">{group.description}</p>
                          )}
                        </div>
                        <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 px-3 py-1 rounded-lg border border-pink-500/30">
                          <p className="text-pink-400 font-bold text-sm">€{group.totalAmount.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-gray-400 text-sm mb-3">
                        <Users className="h-4 w-4 mr-2 text-pink-400" />
                        {group.members.length} membri
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.members.slice(0, 3).map((member) => (
                          <Badge key={member} variant="secondary" className="text-xs bg-gradient-to-r from-gray-800 to-gray-700 text-gray-300 border border-gray-600">
                            {member}
                          </Badge>
                        ))}
                        {group.members.length > 3 && (
                          <Badge variant="secondary" className="text-xs bg-gradient-to-r from-pink-900/30 to-pink-800/30 text-pink-400 border border-pink-500/30">
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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                <Button
                  onClick={() => setSelectedGroup(null)}
                  variant="outline"
                  className="border-gray-700 text-white hover:bg-pink-900/20 hover:border-pink-500 w-full sm:w-auto"
                  data-testid="button-back-to-groups"
                >
                  ← Torna ai gruppi
                </Button>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {selectedGroup.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <TrendingUp className="w-4 h-4 text-pink-400" />
                    <p className="text-gray-400">Totale: <span className="text-pink-400 font-bold">€{selectedGroup.totalAmount.toFixed(2)}</span></p>
                  </div>
                </div>
              </div>
              <Dialog open={showCreateExpense} onOpenChange={setShowCreateExpense}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white shadow-lg shadow-pink-500/30 w-full md:w-auto"
                    data-testid="button-add-expense"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi Spesa
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gradient-to-br from-gray-900 to-black border border-pink-500/20 text-white max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white text-xl">Aggiungi Nuova Spesa</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Registra una nuova spesa per il gruppo e seleziona chi deve partecipare alla divisione
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={expenseForm.handleSubmit(onCreateExpense)} className="space-y-4">
                    <div>
                      <Label htmlFor="description" className="text-white">Descrizione</Label>
                      <Input
                        id="description"
                        {...expenseForm.register('description')}
                        placeholder="es. Spa e massaggio"
                        className="bg-gray-800/50 border-gray-700 text-white mt-1"
                        data-testid="input-expense-description"
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
                        className="bg-gray-800/50 border-gray-700 text-white mt-1"
                        data-testid="input-expense-amount"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="paidBy" className="text-white">Chi ha pagato</Label>
                      <Select onValueChange={(value) => expenseForm.setValue('paidBy', value)}>
                        <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white mt-1" data-testid="select-paid-by">
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
                        <label className="flex items-center space-x-2 text-white p-2 rounded-lg bg-pink-500/10 border border-pink-500/30 cursor-pointer hover:bg-pink-500/20 transition-colors">
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
                            data-testid="checkbox-split-equally"
                          />
                          <span className="text-sm font-medium">Dividi equamente tra tutte</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedGroup.members.map((member, idx) => (
                            <label 
                              key={member} 
                              className="flex items-center space-x-2 text-white p-2 rounded-lg bg-gray-800/50 border border-gray-700 cursor-pointer hover:bg-gray-700/50 transition-colors"
                            >
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
                                data-testid={`checkbox-split-member-${idx}`}
                              />
                              <span className="text-sm">{member}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="category" className="text-white">Categoria</Label>
                      <Select onValueChange={(value) => expenseForm.setValue('category', value)} defaultValue="food">
                        <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white mt-1" data-testid="select-category">
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
                        className="bg-gray-800/50 border-gray-700 text-white mt-1"
                        data-testid="input-expense-date"
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 w-full"
                        data-testid="button-submit-expense"
                      >
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
                <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center text-lg md:text-xl">
                      <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 p-2 rounded-lg mr-3">
                        <Receipt className="h-5 w-5 text-pink-400" />
                      </div>
                      Spese ({expenses.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {expenses.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Receipt className="h-8 w-8 text-pink-400" />
                        </div>
                        <p className="text-gray-400">Nessuna spesa ancora registrata</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-3">
                          {expenses.map((expense, idx) => (
                            <div
                              key={expense.id}
                              className="p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/30 rounded-xl border border-gray-700 hover:border-pink-500/50 transition-all group"
                              data-testid={`expense-${idx}`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-start space-x-3 flex-1">
                                  <span className="text-2xl">
                                    {getCategoryIcon(expense.category)}
                                  </span>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-white group-hover:text-pink-400 transition-colors">
                                      {expense.description}
                                    </h4>
                                    <p className="text-sm text-gray-400 mt-1">
                                      Pagato da <span className="text-pink-400 font-medium">{expense.paidBy}</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 px-3 py-1 rounded-lg border border-pink-500/30">
                                    <p className="font-bold text-pink-400">€{(expense.amount / 100).toFixed(2)}</p>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(expense.date).toLocaleDateString('it-IT')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-xs text-gray-500">Diviso tra:</span>
                                {expense.splitBetween.map((member) => (
                                  <Badge 
                                    key={member} 
                                    variant="secondary" 
                                    className="text-xs bg-gradient-to-r from-gray-700 to-gray-600 text-gray-300 border border-gray-600"
                                  >
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

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Regolamenti */}
                <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center text-lg">
                      <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 p-2 rounded-lg mr-3">
                        <Calculator className="h-5 w-5 text-pink-400" />
                      </div>
                      Regolamenti
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const settlements = calculateSettlements(selectedGroup, expenses);
                      return settlements.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <DollarSign className="h-8 w-8 text-green-400" />
                          </div>
                          <p className="text-gray-400 font-medium">Tutti i conti sono in pari!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {settlements.map((settlement, index) => (
                            <div
                              key={index}
                              className="p-3 bg-gradient-to-r from-pink-500/10 to-pink-600/5 rounded-lg border border-pink-500/30"
                              data-testid={`settlement-${index}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-white font-medium truncate">{settlement.from}</span>
                                  <ArrowRight className="h-4 w-4 text-pink-400 flex-shrink-0" />
                                  <span className="text-white font-medium truncate">{settlement.to}</span>
                                </div>
                                <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 px-2 py-1 rounded border border-pink-500/30 flex-shrink-0">
                                  <span className="font-bold text-pink-400 text-sm whitespace-nowrap">
                                    €{(settlement.amount / 100).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Membri del gruppo */}
                <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center text-lg">
                      <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 p-2 rounded-lg mr-3">
                        <Users className="h-5 w-5 text-pink-400" />
                      </div>
                      Membri ({selectedGroup.members.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedGroup.members.map((member, idx) => (
                        <div
                          key={member}
                          className="flex items-center space-x-3 p-3 bg-gradient-to-r from-gray-800/50 to-gray-700/30 rounded-lg border border-gray-700 hover:border-pink-500/50 transition-all"
                          data-testid={`group-member-${idx}`}
                        >
                          <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 p-2 rounded-full">
                            <User className="h-4 w-4 text-pink-400" />
                          </div>
                          <span className="text-white font-medium">{member}</span>
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
