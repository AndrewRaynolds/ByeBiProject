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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Users, Receipt, DollarSign, User, Trash2, Calculator, ArrowRight, TrendingUp, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from '@/contexts/LanguageContext';

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

interface MemberBalance {
  member: string;
  balance: number;
}

const createGroupSchema = z.object({
  name: z.string().min(1, 'splittabro.validation.groupName'),
  description: z.string().optional(),
  members: z.array(z.string()).min(1, 'splittabro.validation.members'),
});

const createExpenseSchema = z.object({
  description: z.string().min(1, 'splittabro.validation.description'),
  amount: z.number().min(0.01, 'splittabro.validation.amount'),
  paidBy: z.string().min(1, 'splittabro.validation.paidBy'),
  splitBetween: z.array(z.string()).min(1, 'splittabro.validation.splitBetween'),
  category: z.string().min(1, 'splittabro.validation.category'),
  date: z.string().min(1, 'splittabro.validation.date'),
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
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { t, locale } = useTranslation();

  const formatCurrency = (amountInCents: number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amountInCents / 100);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'it-IT');

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
      console.error('Error loading expense groups:', error);
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
      console.error('Error loading expenses:', error);
    }
  };

  const onCreateGroup = async (data: CreateGroupFormValues) => {
    setIsCreatingGroup(true);
    
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
        
        // Redirect automatico al gruppo appena creato
        setSelectedGroup(newGroup);
        
        toast({
          title: t('splittabro.toast.groupCreatedTitle'),
          description: t('splittabro.toast.groupCreatedDesc', { name: newGroup.name }),
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t('splittabro.toast.groupCreateErrorFallback'));
      }
    } catch (error) {
      console.error('Error creating expense group:', error);
      toast({
        title: t('splittabro.toast.groupCreateErrorTitle'),
        description: error instanceof Error 
          ? error.message 
          : t('splittabro.toast.genericRetry'),
        variant: "destructive",
      });
    } finally {
      setIsCreatingGroup(false);
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
          title: t('splittabro.toast.expenseAddedTitle'),
          description: t('splittabro.toast.expenseAddedDesc'),
        });
      } else {
        const errorData = await response.json();
        console.error('Expense validation error:', errorData);
        throw new Error(t('splittabro.toast.expenseCreateErrorFallback'));
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      toast({
        title: t('common.error'),
        description: t('splittabro.toast.expenseCreateErrorTitle'),
        variant: "destructive",
      });
    }
  };

  const calculateBalances = (group: ExpenseGroup, expenses: Expense[]): MemberBalance[] => {
    const balances: { [member: string]: number } = {};
    
    group.members.forEach(member => {
      balances[member] = 0;
    });

    expenses.forEach(expense => {
      if (!expense.splitBetween.length) return;
      const amountPerPerson = expense.amount / expense.splitBetween.length;
      balances[expense.paidBy] = (balances[expense.paidBy] || 0) + expense.amount;
      expense.splitBetween.forEach(member => {
        balances[member] = (balances[member] || 0) - amountPerPerson;
      });
    });

    return Object.entries(balances)
      .map(([member, balance]) => ({ member, balance: Math.round(balance) }))
      .sort((a, b) => b.balance - a.balance);
  };

  const calculateSettlements = (group: ExpenseGroup, expenses: Expense[]): Settlement[] => {
    if (!group || expenses.length === 0) return [];

    const balances = calculateBalances(group, expenses);
    const settlements: Settlement[] = [];
    const creditors = balances
      .filter(({ balance }) => balance > 0)
      .map(({ member, balance }) => ({ member, amount: balance }));
    const debtors = balances
      .filter(({ balance }) => balance < 0)
      .map(({ member, balance }) => ({ member, amount: Math.abs(balance) }));

    let creditorIndex = 0;
    let debtorIndex = 0;

    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];
      const amount = Math.min(creditor.amount, debtor.amount);

      if (amount > 0) {
        settlements.push({
          from: debtor.member,
          to: creditor.member,
          amount,
        });
      }

      creditor.amount -= amount;
      debtor.amount -= amount;

      if (creditor.amount <= 0) creditorIndex += 1;
      if (debtor.amount <= 0) debtorIndex += 1;
    }

    return settlements.filter(s => s.amount > 0);
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

  const getCategoryLabel = (category: string) => t(`splittabro.category.${category}`);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-red-600/30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-red-600 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-white text-lg">{t('splittabro.loading')}</p>
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
            <span className="text-white">Bye</span><span className="text-red-600">Bro</span>
          </button>
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Sparkles className="w-8 h-8 text-red-500" />
              <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-red-500 via-red-600 to-red-500 bg-clip-text text-transparent">
                SplittaBro
              </h1>
              <Sparkles className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-gray-400 text-sm md:text-base">{t('splittabro.subtitle')}</p>
          </div>
          <div className="w-20 hidden md:block"></div>
        </div>

        {!selectedGroup ? (
          /* Vista Gruppi */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {t('splittabro.yourGroups')}
              </h2>
              <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/30 w-full sm:w-auto"
                    data-testid="button-create-group"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('splittabro.newGroup')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gradient-to-br from-gray-900 to-black border border-red-500/20 text-white max-w-md max-h-[88vh] overflow-hidden p-0 gap-0">
                  <DialogHeader>
                    <div className="px-6 pt-6 pb-4 border-b border-white/10">
                      <DialogTitle className="text-white text-xl">{t('splittabro.createGroupTitle')}</DialogTitle>
                      <DialogDescription className="text-gray-400 mt-1">
                      {t('splittabro.createGroupDesc')}
                      </DialogDescription>
                    </div>
                  </DialogHeader>
                  <form onSubmit={groupForm.handleSubmit(onCreateGroup)} className="flex min-h-0 flex-col">
                    <ScrollArea className="max-h-[calc(88vh-150px)] px-6 py-4">
                      <div className="space-y-4 pr-3">
                    <div>
                      <Label htmlFor="name" className="text-white">{t('splittabro.groupName')}</Label>
                      <Input
                        id="name"
                        {...groupForm.register('name')}
                        placeholder=""
                        className="bg-gray-800/50 border-gray-700 text-white mt-1"
                        data-testid="input-group-name"
                      />
                      {groupForm.formState.errors.name && (
                        <p className="text-red-400 text-sm mt-1">
                          {t(String(groupForm.formState.errors.name.message))}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="description" className="text-white">{t('splittabro.descriptionOptional')}</Label>
                      <Textarea
                        id="description"
                        {...groupForm.register('description')}
                        placeholder=""
                        className="bg-gray-800/50 border-gray-700 text-white mt-1"
                        data-testid="input-group-description"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-white">{t('splittabro.members')}</Label>
                      <div className="space-y-2 mt-2">
                        <div className="flex gap-2">
                          <Input
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            placeholder=""
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
                            className="bg-red-600 hover:bg-red-700"
                            data-testid="button-add-member"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <ScrollArea className="h-56 rounded-lg border border-white/10 bg-black/20">
                          <div className="space-y-2 p-2">
                            {groupForm.watch('members')?.map((member, index) => (
                              <div 
                                key={index} 
                                className="flex min-h-11 items-center justify-between gap-3 bg-gradient-to-r from-red-500/10 to-red-600/10 px-3 py-2 rounded-lg border border-red-500/30"
                                data-testid={`member-${index}`}
                              >
                                <span className="text-white text-sm font-medium min-w-0 flex-1 truncate">{member}</span>
                                <Button
                                  type="button"
                                  onClick={() => removeMember(member)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 w-8 p-0"
                                  data-testid={`button-remove-member-${index}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        {groupForm.formState.errors.members && (
                          <p className="text-red-400 text-sm">
                            {t(String(groupForm.formState.errors.members.message))}
                          </p>
                        )}
                      </div>
                    </div>
                      </div>
                    </ScrollArea>
                    
                    <DialogFooter className="border-t border-white/10 bg-black/30 px-6 py-4">
                      <Button 
                        type="submit" 
                        disabled={isCreatingGroup}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid="button-submit-group"
                      >
                        {isCreatingGroup ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            {t('splittabro.creating')}
                          </div>
                        ) : (
                          t('splittabro.createGroup')
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {groups.length === 0 ? (
              <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-red-500/20 backdrop-blur-sm">
                <CardContent className="text-center py-16">
                  <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-10 w-10 text-red-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{t('splittabro.noGroupsTitle')}</h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">{t('splittabro.noGroupsDesc')}</p>
                  <Button
                    onClick={() => setShowCreateGroup(true)}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/30"
                    data-testid="button-create-first-group"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('splittabro.createFirstGroup')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 hover:border-red-500 cursor-pointer transition-all hover:shadow-xl hover:shadow-red-500/20 backdrop-blur-sm group"
                    onClick={() => setSelectedGroup(group)}
                    data-testid={`group-card-${group.id}`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-white text-lg mb-1 group-hover:text-red-400 transition-colors">
                            {group.name}
                          </CardTitle>
                          {group.description && (
                            <p className="text-gray-400 text-sm">{group.description}</p>
                          )}
                        </div>
                        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 px-3 py-1 rounded-lg border border-red-500/30">
                          <p className="text-red-400 font-bold text-sm">{formatCurrency(Math.round((group.totalAmount || 0) * 100))}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center text-gray-400 text-sm mb-3">
                        <Users className="h-4 w-4 mr-2 text-red-400" />
                        {t('splittabro.membersCount', { count: group.members.length })}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.members.slice(0, 3).map((member) => (
                          <Badge key={member} variant="secondary" className="text-xs bg-gradient-to-r from-gray-800 to-gray-700 text-gray-300 border border-gray-600">
                            {member}
                          </Badge>
                        ))}
                        {group.members.length > 3 && (
                          <Badge variant="secondary" className="text-xs bg-gradient-to-r from-red-900/30 to-red-800/30 text-red-400 border border-red-500/30">
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
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white w-full sm:w-auto"
                  data-testid="button-back-to-groups"
                >
                  {t('splittabro.backToGroups')}
                </Button>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {selectedGroup.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <TrendingUp className="w-4 h-4 text-red-400" />
                    <p className="text-gray-400">{t('splittabro.total')}: <span className="text-red-400 font-bold">{formatCurrency(Math.round((selectedGroup.totalAmount || 0) * 100))}</span></p>
                  </div>
                </div>
              </div>
              <Dialog open={showCreateExpense} onOpenChange={setShowCreateExpense}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/30 w-full md:w-auto"
                    data-testid="button-add-expense"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('splittabro.addExpense')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gradient-to-br from-gray-900 to-black border border-red-500/20 text-white max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white text-xl">{t('splittabro.addExpenseTitle')}</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      {t('splittabro.addExpenseDesc')}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={expenseForm.handleSubmit(onCreateExpense)} className="space-y-4">
                    <div>
                      <Label htmlFor="description" className="text-white">{t('splittabro.expenseDescription')}</Label>
                      <Input
                        id="description"
                        {...expenseForm.register('description')}
                        placeholder=""
                        className="bg-gray-800/50 border-gray-700 text-white mt-1"
                        data-testid="input-expense-description"
                      />
                      {expenseForm.formState.errors.description && (
                        <p className="text-red-400 text-sm mt-1">
                          {t(String(expenseForm.formState.errors.description.message))}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="amount" className="text-white">{t('splittabro.amount')}</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        {...expenseForm.register('amount', { valueAsNumber: true })}
                        placeholder="0.00"
                        className="bg-gray-800/50 border-gray-700 text-white mt-1"
                        data-testid="input-expense-amount"
                      />
                      {expenseForm.formState.errors.amount && (
                        <p className="text-red-400 text-sm mt-1">
                          {t(String(expenseForm.formState.errors.amount.message))}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="paidBy" className="text-white">{t('splittabro.paidBy')}</Label>
                      <Select onValueChange={(value) => expenseForm.setValue('paidBy', value)}>
                        <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white mt-1" data-testid="select-paid-by">
                          <SelectValue placeholder={t('splittabro.selectPaidBy')} className="text-white" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          {selectedGroup.members.map((member) => (
                            <SelectItem key={member} value={member} className="text-white focus:text-white">
                              {member}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {expenseForm.formState.errors.paidBy && (
                        <p className="text-red-400 text-sm mt-1">
                          {t(String(expenseForm.formState.errors.paidBy.message))}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-white">{t('splittabro.splitBetween')}</Label>
                      <div className="space-y-2 mt-2">
                        <label className="flex items-center space-x-2 text-white p-2 rounded-lg bg-red-500/10 border border-red-500/30 cursor-pointer hover:bg-red-500/20 transition-colors">
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
                          <span className="text-sm font-medium">{t('splittabro.splitEqually')}</span>
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
                        {expenseForm.formState.errors.splitBetween && (
                          <p className="text-red-400 text-sm">
                            {t(String(expenseForm.formState.errors.splitBetween.message))}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="category" className="text-white">{t('splittabro.category')}</Label>
                      <Select onValueChange={(value) => expenseForm.setValue('category', value)} defaultValue="food">
                        <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white mt-1" data-testid="select-category">
                          <SelectValue placeholder={t('splittabro.selectCategory')} className="text-white" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                          <SelectItem value="food" className="text-white focus:text-white">🍽️ {getCategoryLabel('food')}</SelectItem>
                          <SelectItem value="transport" className="text-white focus:text-white">🚗 {getCategoryLabel('transport')}</SelectItem>
                          <SelectItem value="accommodation" className="text-white focus:text-white">🏨 {getCategoryLabel('accommodation')}</SelectItem>
                          <SelectItem value="entertainment" className="text-white focus:text-white">🎉 {getCategoryLabel('entertainment')}</SelectItem>
                          <SelectItem value="shopping" className="text-white focus:text-white">🛍️ {getCategoryLabel('shopping')}</SelectItem>
                          <SelectItem value="other" className="text-white focus:text-white">📋 {getCategoryLabel('other')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {expenseForm.formState.errors.category && (
                        <p className="text-red-400 text-sm mt-1">
                          {t(String(expenseForm.formState.errors.category.message))}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="date" className="text-white">{t('splittabro.date')}</Label>
                      <Input
                        id="date"
                        type="date"
                        {...expenseForm.register('date')}
                        className="bg-gray-800/50 border-gray-700 text-white mt-1"
                        data-testid="input-expense-date"
                      />
                      {expenseForm.formState.errors.date && (
                        <p className="text-red-400 text-sm mt-1">
                          {t(String(expenseForm.formState.errors.date.message))}
                        </p>
                      )}
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 w-full"
                        data-testid="button-submit-expense"
                      >
                        {t('splittabro.addExpense')}
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
                      <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 p-2 rounded-lg mr-3">
                        <Receipt className="h-5 w-5 text-red-400" />
                      </div>
                      {t('splittabro.expensesCount', { count: expenses.length })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {expenses.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Receipt className="h-8 w-8 text-red-400" />
                        </div>
                        <p className="text-gray-400">{t('splittabro.noExpenses')}</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-3">
                          {expenses.map((expense, idx) => (
                            <div
                              key={expense.id}
                              className="p-4 bg-gradient-to-r from-gray-800/50 to-gray-700/30 rounded-xl border border-gray-700 hover:border-red-500/50 transition-all group"
                              data-testid={`expense-${idx}`}
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-start space-x-3 flex-1">
                                  <span className="text-2xl">
                                    {getCategoryIcon(expense.category)}
                                  </span>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-white group-hover:text-red-400 transition-colors">
                                      {expense.description}
                                    </h4>
                                    <p className="text-sm text-gray-400 mt-1">
                                      {t('splittabro.paidByInline')} <span className="text-red-400 font-medium">{expense.paidBy}</span>
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right ml-4">
                                  <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 px-3 py-1 rounded-lg border border-red-500/30">
                                    <p className="font-bold text-red-400">{formatCurrency(expense.amount)}</p>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatDate(expense.date)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-xs text-gray-500">{t('splittabro.splitBetweenInline')}:</span>
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
                      <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 p-2 rounded-lg mr-3">
                        <Calculator className="h-5 w-5 text-red-400" />
                      </div>
                      {t('splittabro.settlements')}
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
                          <p className="text-gray-400 font-medium">{t('splittabro.allSettled')}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {settlements.map((settlement, index) => (
                            <div
                              key={index}
                              className="p-3 bg-gradient-to-r from-red-500/10 to-red-600/5 rounded-lg border border-red-500/30"
                              data-testid={`settlement-${index}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-white font-medium truncate">{settlement.from}</span>
                                  <ArrowRight className="h-4 w-4 text-red-400 flex-shrink-0" />
                                  <span className="text-white font-medium truncate">{settlement.to}</span>
                                </div>
                                <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 px-2 py-1 rounded border border-red-500/30 flex-shrink-0">
                                  <span className="font-bold text-red-400 text-sm whitespace-nowrap">
                                    {formatCurrency(settlement.amount)}
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

                {/* Saldi */}
                <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center text-lg">
                      <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 p-2 rounded-lg mr-3">
                        <TrendingUp className="h-5 w-5 text-red-400" />
                      </div>
                      {t('splittabro.balances')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {calculateBalances(selectedGroup, expenses).map(({ member, balance }, idx) => {
                        const statusKey = balance > 0 ? 'splittabro.getsBack' : balance < 0 ? 'splittabro.owes' : 'splittabro.even';
                        const statusColor = balance > 0 ? 'text-green-400' : balance < 0 ? 'text-red-400' : 'text-gray-400';
                        return (
                          <div
                            key={member}
                            className="flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-gray-800/50 to-gray-700/30 rounded-lg border border-gray-700"
                            data-testid={`member-balance-${idx}`}
                          >
                            <span className="text-white font-medium truncate">{member}</span>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${statusColor}`}>{t(statusKey)}</p>
                              <p className={`text-sm ${statusColor}`}>{formatCurrency(Math.abs(balance))}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Membri del gruppo */}
                <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center text-lg">
                      <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 p-2 rounded-lg mr-3">
                        <Users className="h-5 w-5 text-red-400" />
                      </div>
                      {t('splittabro.membersCount', { count: selectedGroup.members.length })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedGroup.members.map((member, idx) => (
                        <div
                          key={member}
                          className="flex items-center space-x-3 p-3 bg-gradient-to-r from-gray-800/50 to-gray-700/30 rounded-lg border border-gray-700 hover:border-red-500/50 transition-all"
                          data-testid={`group-member-${idx}`}
                        >
                          <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 p-2 rounded-full">
                            <User className="h-4 w-4 text-red-400" />
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
