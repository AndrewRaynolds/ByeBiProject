-- Expense and expense-group totals use integer minor units (cents).
-- Repair historical groups that were not updated when expenses changed.
UPDATE public.expense_groups AS groups
SET total_amount = COALESCE((
  SELECT SUM(expenses.amount)::integer
  FROM public.expenses AS expenses
  WHERE expenses.group_id = groups.id
), 0);

ALTER TABLE public.expense_groups
  ALTER COLUMN total_amount SET DEFAULT 0,
  ALTER COLUMN total_amount SET NOT NULL;
