'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createTransactionAction, updateTransactionAction } from '../actions';
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  minorToDecimalString,
} from '../../../lib/money/money';
import { useI18n } from '../../../lib/i18n/context';
import { CascadingTagSelector } from '../../tags/components/cascading-tag-selector';
import type { Account, Person, Tag } from '../../../db/schema';
import dayjs from '../../../lib/date/dayjs';
import { localDb } from '../../../offline/database';
import { enqueueOutboxOperation } from '../../../offline/outbox';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Paperclip,
  Sparkles,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  X,
  Loader2,
  Lock,
} from 'lucide-react';

interface TransactionFormProps {
  accounts: Account[];
  people: Person[];
  tags: Tag[];
  initialType?: string;
  editTransaction?: any;
  addonsForId?: string;
  parentTransaction?: any;
}

interface FormAddon {
  id: string;
  description: string;
  amount: string;
  type: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  tagIds?: string[];
  notes?: string;
}

function generateRandomCode(length = 8): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function TransactionForm({
  accounts,
  people,
  tags,
  initialType = 'expense',
  editTransaction = null,
  addonsForId,
  parentTransaction = null,
}: TransactionFormProps) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);

  const isEditing = !!editTransaction;
  const isAddonMode = !!addonsForId;

  // Extract initial accounts from editTransaction entries if editing
  const initialSourceAccountId =
    editTransaction?.entries?.find(
      (e: any) => e.direction === 'credit' && e.accountId,
    )?.accountId || '';

  const initialDestinationAccountId =
    editTransaction?.entries?.find(
      (e: any) => e.direction === 'debit' && e.accountId,
    )?.accountId || '';

  // If in addon mode, default source account to parent's source account
  const parentSourceAccountId =
    parentTransaction?.entries?.find(
      (e: any) => e.direction === 'credit' && e.accountId,
    )?.accountId || '';

  const [type, setType] = useState<string>(
    editTransaction?.type || (isAddonMode ? 'expense' : initialType),
  );
  const [currency, setCurrency] = useState<string>(
    editTransaction?.currency ||
      parentTransaction?.currency ||
      DEFAULT_CURRENCY,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [mainAmount, setMainAmount] = useState<string>(() => {
    if (editTransaction) {
      const minor =
        typeof editTransaction.amountMinor === 'bigint'
          ? editTransaction.amountMinor
          : BigInt(editTransaction.amountMinor || '0');
      return minorToDecimalString(minor, editTransaction.currency);
    }
    return '';
  });

  const [description, setDescription] = useState<string>(
    editTransaction?.description || '',
  );
  const [sourceAccountId, setSourceAccountId] = useState<string>(
    initialSourceAccountId || parentSourceAccountId || '',
  );
  const [destinationAccountId, setDestinationAccountId] = useState<string>(
    initialDestinationAccountId,
  );
  const [personId, setPersonId] = useState<string>(
    editTransaction?.personId || '',
  );
  const [notes, setNotes] = useState<string>(editTransaction?.notes || '');

  // Local timezone datetime initialized in user's browser local time
  const [occurredAt, setOccurredAt] = useState<string>(() =>
    editTransaction?.occurredAt
      ? dayjs(editTransaction.occurredAt).format('YYYY-MM-DDTHH:mm')
      : dayjs().format('YYYY-MM-DDTHH:mm'),
  );

  // Addon transactions state (for inline addons when creating a new transaction)
  const [addons, setAddons] = useState<FormAddon[]>([]);

  // 8-Character Challenge State for Edits
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [expectedCode, setExpectedCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Follow-up prompt modal after creating any transaction
  const [followUpModal, setFollowUpModal] = useState<{
    isOpen: boolean;
    transactionId: string;
    description: string;
    isAddon: boolean;
  } | null>(null);

  const isCodeMatched =
    enteredCode.trim().length === 8 &&
    enteredCode.trim().toUpperCase() === expectedCode.toUpperCase();

  const availableCurrencies = Object.keys(SUPPORTED_CURRENCIES);
  const filteredAccounts = accounts.filter((a) => a.currency === currency);

  const typeOptions = [
    {
      label: t.transactionForm.typeExpense,
      value: 'expense',
      short: t.dashboard.addExpense,
    },
    {
      label: t.transactionForm.typeIncome,
      value: 'income',
      short: t.dashboard.addIncome,
    },
    {
      label: t.transactionForm.typeTransfer,
      value: 'transfer',
      short: t.dashboard.transfer,
    },
    {
      label: t.transactionForm.typeLoanGiven,
      value: 'loan_given',
      short: t.people.giveLoan,
    },
    {
      label: t.transactionForm.typeLoanReceived,
      value: 'loan_received',
      short: t.people.receiveLoan,
    },
    {
      label: t.transactionForm.typeRepaymentReceived,
      value: 'repayment_received',
      short: t.people.recordRepayment,
    },
    {
      label: t.transactionForm.typeRepaymentMade,
      value: 'repayment_made',
      short: t.people.youOwe,
    },
  ];

  // Helper to add addon transaction
  const addAddon = (presetDescription = '', presetAmount = '') => {
    const newAddon: FormAddon = {
      id: crypto.randomUUID(),
      description: presetDescription,
      amount: presetAmount,
      type: 'expense',
      sourceAccountId: '',
      destinationAccountId: '',
      tagIds: [],
    };
    setAddons((prev) => [...prev, newAddon]);
  };

  const removeAddon = (id: string) => {
    setAddons((prev) => prev.filter((a) => a.id !== id));
  };

  const updateAddon = (id: string, updates: Partial<FormAddon>) => {
    setAddons((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    );
  };

  // Calculate live financial summary
  const numericMain = parseFloat(mainAmount) || 0;
  const numericAddons = addons.reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0),
    0,
  );
  const grandTotal = numericMain + numericAddons;

  // Save to Dexie when offline or on network failure
  async function saveOffline(
    formData: FormData,
    parsedOccurredAtIso: string,
    cleanAddons: FormAddon[],
    offlineTxId = crypto.randomUUID(),
  ) {
    if (!localDb) {
      throw new Error('Local database unavailable');
    }

    const desc = formData.get('description') as string;
    const n = (formData.get('notes') as string) || null;
    const srcAcc = (formData.get('sourceAccountId') as string) || null;
    const destAcc = (formData.get('destinationAccountId') as string) || null;
    const pid = (formData.get('personId') as string) || null;
    const tagIdsRaw = (formData.getAll('tagIds') as string[]).filter(Boolean);
    const parentTxId =
      (formData.get('parentTransactionId') as string) || addonsForId || null;

    const mainMinor = Math.round(numericMain * 100).toString();

    // 1. Create main local transaction
    await localDb.transactions.put({
      id: offlineTxId,
      userId: 'local-user',
      type,
      occurredAt: parsedOccurredAtIso,
      description: desc,
      notes: n,
      currency,
      amountMinor: mainMinor,
      personId: pid,
      parentTransactionId: parentTxId,
      idempotencyKey: crypto.randomUUID(),
      tagIds: tagIdsRaw,
      entries: [
        {
          id: crypto.randomUUID(),
          transactionId: offlineTxId,
          accountId: srcAcc || destAcc || null,
          direction: type === 'income' ? 'debit' : 'credit',
          amountMinor: mainMinor,
          currency,
        },
      ],
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
    });

    // 2. Create local addon transactions
    for (const addon of cleanAddons) {
      const addonId = addon.id || crypto.randomUUID();
      const addonAmountFloat = parseFloat(addon.amount) || 0;
      const addonMinor = Math.round(addonAmountFloat * 100).toString();

      await localDb.transactions.put({
        id: addonId,
        userId: 'local-user',
        type: addon.type || 'expense',
        occurredAt: parsedOccurredAtIso,
        description: addon.description,
        notes: addon.notes || `Add-on to: ${desc}`,
        currency,
        amountMinor: addonMinor,
        personId: pid,
        parentTransactionId: offlineTxId,
        idempotencyKey: crypto.randomUUID(),
        tagIds: addon.tagIds || [],
        entries: [
          {
            id: crypto.randomUUID(),
            transactionId: addonId,
            accountId: addon.sourceAccountId || srcAcc || null,
            direction: 'credit',
            amountMinor: addonMinor,
            currency,
          },
        ],
        syncStatus: 'pending',
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Queue to outbox
    await enqueueOutboxOperation('CREATE_TRANSACTION', {
      type,
      amount: mainAmount,
      currency,
      description: desc,
      notes: n,
      occurredAt: parsedOccurredAtIso,
      sourceAccountId: srcAcc,
      destinationAccountId: destAcc,
      personId: pid,
      parentTransactionId: parentTxId,
      tagIds: tagIdsRaw,
      addons: cleanAddons.map((a) => ({
        description: a.description,
        amount: a.amount,
        type: a.type || 'expense',
        sourceAccountId: a.sourceAccountId || srcAcc || null,
        destinationAccountId: a.destinationAccountId || destAcc || null,
        tagIds: a.tagIds || [],
        notes: a.notes || null,
      })),
    });
  }

  // Handle Form Submission (Create or Trigger Edit Challenge)
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    // If Editing: intercept and trigger the 8-character challenge modal!
    if (isEditing) {
      if (!description.trim()) {
        setError('Description is required');
        return;
      }
      if (numericMain <= 0) {
        setError('Amount must be greater than zero');
        return;
      }

      const code = generateRandomCode(8);
      setExpectedCode(code);
      setEnteredCode('');
      setChallengeError(null);
      setIsChallengeModalOpen(true);
      return;
    }

    // Normal Creation Flow
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set('type', type);

    const localDate = new Date(occurredAt);
    const occurredAtIso = !isNaN(localDate.getTime())
      ? localDate.toISOString()
      : new Date().toISOString();

    formData.set('occurredAt', occurredAtIso);

    if (addonsForId) {
      formData.set('parentTransactionId', addonsForId);
    }

    // Filter valid addons
    const validAddons = addons.filter(
      (a) => a.description.trim() && parseFloat(a.amount) > 0,
    );
    formData.set('addons', JSON.stringify(validAddons));

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (isOffline) {
      try {
        const offlineId = crypto.randomUUID();
        await saveOffline(formData, occurredAtIso, validAddons, offlineId);
        setIsLoading(false);
        setFollowUpModal({
          isOpen: true,
          transactionId: offlineId,
          description: description || 'Transaction',
          isAddon: isAddonMode,
        });
      } catch (err: any) {
        setError(err?.message || 'Failed to save offline');
        setIsLoading(false);
      }
      return;
    }

    try {
      const res = await createTransactionAction(formData);
      if (res?.error) {
        setError(res.error);
        setIsLoading(false);
      } else {
        const createdId = res.transactionId || '';
        setIsLoading(false);
        toast.success(
          isAddonMode
            ? 'Add-on transaction linked successfully!'
            : 'Transaction recorded successfully!',
          {
            action: {
              label: '+ Add-on',
              onClick: () => {
                const targetId = isAddonMode
                  ? addonsForId || createdId
                  : createdId;
                router.push(
                  `/${locale}/transactions/new?addonsForId=${targetId}`,
                );
              },
            },
          },
        );
        // Show follow-up modal for instant "+ Add-on" coupling!
        setFollowUpModal({
          isOpen: true,
          transactionId: createdId,
          description: description || 'Transaction',
          isAddon: isAddonMode,
        });
      }
    } catch (err: any) {
      console.warn(
        'Online submission failed, falling back to offline outbox:',
        err,
      );
      try {
        const offlineId = crypto.randomUUID();
        await saveOffline(formData, occurredAtIso, validAddons, offlineId);
        setIsLoading(false);
        toast.success('Saved offline (pending sync)');
        setFollowUpModal({
          isOpen: true,
          transactionId: offlineId,
          description: description || 'Transaction',
          isAddon: isAddonMode,
        });
      } catch (offlineErr: any) {
        setError(offlineErr?.message || 'Failed to record transaction');
        setIsLoading(false);
      }
    }
  }

  // Handle Confirmed Edit Submission from Challenge Modal
  async function handleConfirmEdit() {
    if (!isCodeMatched) {
      setChallengeError(
        'Please type the exact 8-character challenge code to confirm.',
      );
      return;
    }

    setChallengeError(null);
    setIsSavingEdit(true);

    const localDate = new Date(occurredAt);
    const occurredAtIso = !isNaN(localDate.getTime())
      ? localDate.toISOString()
      : new Date().toISOString();

    const formData = new FormData(formRef.current || undefined);
    formData.set('description', description.trim());
    formData.set('amount', mainAmount.trim());
    formData.set('notes', notes.trim());
    formData.set('occurredAt', occurredAtIso);
    if (sourceAccountId) formData.set('sourceAccountId', sourceAccountId);
    if (destinationAccountId)
      formData.set('destinationAccountId', destinationAccountId);
    if (personId) formData.set('personId', personId);
    formData.set('confirmationCode', enteredCode.trim().toUpperCase());
    formData.set('expectedCode', expectedCode.toUpperCase());

    try {
      const res = await updateTransactionAction(editTransaction.id, formData);
      if (res?.error) {
        setChallengeError(res.error);
        setIsSavingEdit(false);
      } else {
        toast.success('Transaction updated successfully!');
        setIsChallengeModalOpen(false);
        router.push(`/${locale}/transactions`);
      }
    } catch (err: any) {
      setChallengeError(err?.message || 'Failed to update transaction');
      setIsSavingEdit(false);
    }
  }

  return (
    <div className="glass-panel p-6 md:p-8 rounded-3xl max-w-2xl mx-auto border border-white/10 shadow-2xl relative">
      {/* Edit Mode Banner */}
      {isEditing && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Editing Existing Ledger Record
              </div>
              <div className="text-xs text-slate-300">
                Saving will require completing an 8-character manual typing
                challenge.
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-lg">
            Protected
          </span>
        </div>
      )}

      {/* Add-on Mode Banner */}
      {isAddonMode && (
        <div className="mb-6 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Paperclip className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Add-on Mode (Coupled to Parent Transaction)
              </div>
              <div className="text-xs text-slate-300">
                {parentTransaction ? (
                  <span>
                    Coupled to:{' '}
                    <strong className="text-cyan-200">
                      &quot;{parentTransaction.description}&quot;
                    </strong>
                  </span>
                ) : (
                  `Coupled to transaction #${addonsForId?.slice(0, 8)}...`
                )}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-500/20 px-2.5 py-1 rounded-lg">
            +Add-on
          </span>
        </div>
      )}

      {/* Type Selector Tabs (Hidden when editing to maintain accounting leg integrity) */}
      {!isEditing && (
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900/80 rounded-2xl mb-6 border border-white/5">
          {typeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                type === opt.value
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {opt.short}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-5"
        id="new-transaction-form"
      >
        {/* Hidden Parent Transaction ID when in Add-on Mode */}
        {addonsForId && (
          <input type="hidden" name="parentTransactionId" value={addonsForId} />
        )}

        {/* Amount & Currency */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {isEditing
                ? 'Amount'
                : isAddonMode
                  ? 'Add-on Amount'
                  : 'Main Amount'}
            </label>
            <input
              type="text"
              name="amount"
              required
              value={mainAmount}
              onChange={(e) => setMainAmount(e.target.value)}
              placeholder="e.g. 250.00"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white font-mono text-base focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Currency
            </label>
            <select
              name="currency"
              value={currency}
              disabled={isEditing}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white font-semibold text-sm focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-60"
            >
              {availableCurrencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            {isAddonMode ? 'Add-on Description' : 'Description'}
          </label>
          <input
            type="text"
            name="description"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isAddonMode
                ? 'e.g. Delivery fee, Driver tip, Packaging charge, Extra dessert'
                : 'e.g. Grocery shopping, Flight ticket, Dinner with friends'
            }
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Account Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(type === 'expense' ||
            type === 'transfer' ||
            type === 'loan_given' ||
            type === 'repayment_made') && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                From Account
              </label>
              <select
                name="sourceAccountId"
                required
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">Select source account...</option>
                {filteredAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.accountType})
                  </option>
                ))}
              </select>
            </div>
          )}

          {(type === 'income' ||
            type === 'transfer' ||
            type === 'loan_received' ||
            type === 'repayment_received') && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                To Account
              </label>
              <select
                name="destinationAccountId"
                required
                value={destinationAccountId}
                onChange={(e) => setDestinationAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="">Select destination account...</option>
                {filteredAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.accountType})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Person Picker (for Loans & Repayments) */}
        {(type === 'loan_given' ||
          type === 'loan_received' ||
          type === 'repayment_received' ||
          type === 'repayment_made') && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Person
            </label>
            <select
              name="personId"
              required
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Select contact / person...</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.contact ? `(${p.contact})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date & Time (User's Local Timezone) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Date & Time (Local Time)
            </label>
            <span className="text-[11px] text-emerald-400 font-mono">
              Local Zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </span>
          </div>
          <input
            type="datetime-local"
            name="occurredAt"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Hierarchical Cascading Tags */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Categories & Tags
          </label>
          <CascadingTagSelector
            tags={tags}
            defaultSelectedIds={
              editTransaction?.tags?.map((t: any) => t.id) || []
            }
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Notes (Optional)
          </label>
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Additional context or remarks..."
            className="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            id="btn-submit-transaction"
            className={`w-full py-3.5 px-6 rounded-xl font-bold transition shadow-xl disabled:opacity-50 text-sm cursor-pointer ${
              isEditing
                ? 'bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 shadow-amber-500/20'
                : isAddonMode
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/25'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
            }`}
          >
            {isLoading
              ? 'Recording Ledger Transaction...'
              : isEditing
                ? 'Save Changes (Opens Verification Challenge)'
                : isAddonMode
                  ? 'Save Add-on Transaction'
                  : addons.length > 0
                    ? `Save Transaction + ${addons.length} Add-on${addons.length > 1 ? 's' : ''}`
                    : 'Save Transaction'}
          </button>
        </div>
      </form>

      {/* Follow-up Modal: Prompt for Add-ons or Done */}
      {followUpModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl border border-cyan-500/40 bg-slate-900/95 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 mx-auto flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/10">
              🎉
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">
                {followUpModal.isAddon
                  ? 'Add-on Coupled Successfully!'
                  : 'Transaction Recorded!'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {followUpModal.isAddon
                  ? 'Your add-on transaction has been linked and grouped with the parent transaction in the timeline.'
                  : 'Your transaction has been written to the ledger. Would you like to attach an add-on transaction (e.g. delivery fee, tip, tax, service charge)?'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-left text-xs space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">
                Recorded Entry
              </div>
              <div className="font-semibold text-slate-100 truncate">
                {followUpModal.description}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const targetId = followUpModal.isAddon
                    ? addonsForId
                    : followUpModal.transactionId;
                  const isCurrentSameAddon =
                    followUpModal.isAddon && addonsForId === targetId;
                  setFollowUpModal(null);
                  if (isCurrentSameAddon) {
                    setDescription('');
                    setMainAmount('');
                    setNotes('');
                    setAddons([]);
                    toast.success(
                      'Ready for next add-on! Enter amount and description below.',
                    );
                  } else {
                    router.push(
                      `/${locale}/transactions/new?addonsForId=${targetId}`,
                    );
                  }
                }}
                className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/50 transition cursor-pointer"
              >
                <Paperclip className="h-4 w-4" />
                <span>
                  {followUpModal.isAddon
                    ? '+ Add Another Add-on'
                    : '+ Add-on Transaction'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFollowUpModal(null);
                  router.push(`/${locale}/transactions`);
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                View in Timeline →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8-Character Challenge Modal for Edits: COPY DISABLED, MUST TYPE MANUALLY */}
      {isChallengeModalOpen && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full rounded-3xl border border-amber-500/40 bg-slate-900/95 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <ShieldAlert className="h-5 w-5" />
                <span>Security Verification Challenge</span>
              </div>
              <button
                type="button"
                onClick={() => setIsChallengeModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              To protect double-entry ledger integrity against accidental edits,
              please carefully read and type the 8-character challenge code
              below.
              <strong className="block text-amber-300 mt-1 font-semibold">
                Copy-paste is disabled — you must type each character manually.
              </strong>
            </p>

            {/* 8-Character Challenge Display with COPY COMPLETELY DISABLED */}
            <div
              className="flex items-center justify-center gap-1.5 sm:gap-2 py-3 select-none pointer-events-none"
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
              }}
              onCopy={(e) => {
                e.preventDefault();
                return false;
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                return false;
              }}
            >
              {expectedCode.split('').map((char, idx) => (
                <div
                  key={idx}
                  className="w-9 h-12 sm:w-10 sm:h-13 rounded-xl bg-slate-950 border-2 border-amber-500/60 flex items-center justify-center font-mono font-black text-xl text-amber-400 shadow-inner select-none pointer-events-none"
                >
                  {char}
                </div>
              ))}
            </div>

            {challengeError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{challengeError}</span>
              </div>
            )}

            {/* Manual Input Box with PASTE COMPLETELY DISABLED */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Type the 8 characters here:
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={8}
                  autoFocus
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                  onPaste={(e) => {
                    e.preventDefault();
                    toast.error(
                      'Copy-paste is disabled. Please type the 8 characters manually.',
                    );
                  }}
                  onDrop={(e) => e.preventDefault()}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Type 8 characters..."
                  className={`w-full text-center px-4 py-2.5 rounded-xl bg-slate-950 border font-mono font-bold text-base tracking-widest transition focus:outline-none ${
                    isCodeMatched
                      ? 'border-emerald-500 text-emerald-400 ring-2 ring-emerald-500/30'
                      : 'border-slate-800 text-white focus:border-amber-500'
                  }`}
                />
                {isCodeMatched && (
                  <div className="absolute right-3 top-2.5 text-emerald-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="text-[11px]">
                {isCodeMatched ? (
                  <span className="text-emerald-400 font-bold">
                    ✓ Challenge verified! You may now confirm and save.
                  </span>
                ) : enteredCode.length > 0 ? (
                  <span className="text-amber-400/90 font-mono">
                    {enteredCode.length}/8 characters typed (keep typing...)
                  </span>
                ) : (
                  <span className="text-slate-500">
                    Type the code above character by character.
                  </span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsChallengeModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isCodeMatched || isSavingEdit}
                onClick={handleConfirmEdit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-950/40 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Confirm & Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
