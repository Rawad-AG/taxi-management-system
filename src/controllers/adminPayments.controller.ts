import { PayLaterDebt } from '../models/PayLaterDebt.js';
import { BucketTransaction } from '../models/BucketTransaction.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toDebtDTO, creditBucket, debitBucket } from '../services/payment.service.js';
import { createNotification } from '../services/notification.service.js';
import { refId } from '../services/rideFlow.service.js';
import type { AuthedRequest } from '../middleware/auth.js';

const userId = (req: unknown) => (req as AuthedRequest).userId;

export const listDebts = asyncHandler(async (req, res) => {
  const { status } = req.query as { status?: string };
  const filter: Record<string, unknown> = {};
  if (status === 'paid' || status === 'waived') filter.status = status;
  else filter.status = { $in: ['outstanding', 'overdue'] };

  const debts = await PayLaterDebt.find(filter)
    .sort({ status: 1, dueDate: 1 })
    .limit(100)
    .populate<{ customer: { _id: unknown; firstName?: string; lastName?: string; phone?: string } | null }>(
      'customer',
      'firstName lastName phone',
    );

  res.json({
    debts: debts.map((d) => {
      const c = d.customer as unknown as { _id: unknown; firstName?: string; lastName?: string; phone?: string } | null;
      return {
        ...toDebtDTO(d),
        customer: c
          ? {
              id: String(c._id),
              name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Customer',
              phone: c.phone ?? null,
            }
          : null,
      };
    }),
    totals: await getTotals(),
  });
});

async function getTotals() {
  const agg = await PayLaterDebt.aggregate([
    { $group: { _id: '$status', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(agg.map((r) => [r._id, r]));
  const open = (byStatus.outstanding?.total ?? 0) + (byStatus.overdue?.total ?? 0);
  const buckets = await User.aggregate([
    { $match: { role: 'customer' } },
    { $group: { _id: null, balance: { $sum: { $ifNull: ['$bucketBalance', 0] } } } },
  ]);
  return {
    outstanding: byStatus.outstanding?.total ?? 0,
    overdue: byStatus.overdue?.total ?? 0,
    open,
    bucketTotal: buckets[0]?.balance ?? 0,
    counts: {
      outstanding: byStatus.outstanding?.count ?? 0,
      overdue: byStatus.overdue?.count ?? 0,
    },
  };
}

export const settleDebt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const me = userId(req);

  const debt = await PayLaterDebt.findById(id);
  if (!debt) throw ApiError.notFound('Debt not found');
  if (debt.status === 'paid' || debt.status === 'waived') throw ApiError.badRequest('Debt already settled');

  debt.status = 'paid';
  debt.paidAt = new Date();
  debt.settledBy = new mongoose.Types.ObjectId(me);
  debt.settledNote = note || undefined;
  await debt.save();

  await createNotification(refId(debt.customer), {
    type: 'payLater',
    title: 'Debt settled',
    body: note
      ? `Support settled your ${debt.amount.toLocaleString()} SYP debt. ${note}`
      : `Support settled your ${debt.amount.toLocaleString()} SYP debt.`,
    data: { debtId: String(debt._id) },
  });

  res.json({ debt: toDebtDTO(debt) });
});

export const waiveDebt = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;
  const me = userId(req);

  const debt = await PayLaterDebt.findById(id);
  if (!debt) throw ApiError.notFound('Debt not found');
  if (debt.status === 'paid' || debt.status === 'waived') throw ApiError.badRequest('Debt already settled');

  debt.status = 'waived';
  debt.paidAt = new Date();
  debt.settledBy = new mongoose.Types.ObjectId(me);
  debt.settledNote = note || 'Waived by support';
  await debt.save();

  await createNotification(refId(debt.customer), {
    type: 'payLater',
    title: 'Debt waived',
    body: `Your ${debt.amount.toLocaleString()} SYP debt was waived.`,
    data: { debtId: String(debt._id) },
  });

  res.json({ debt: toDebtDTO(debt) });
});

export const adjustBucket = asyncHandler(async (req, res) => {
  const { userId: targetId, amount, note } = req.body;
  const me = userId(req);
  if (String(me) === targetId) throw ApiError.badRequest('Use your own deposit endpoint');

  const target = await User.findById(targetId);
  if (!target) throw ApiError.notFound('User not found');
  if (target.role !== 'customer') throw ApiError.badRequest('Only customer buckets can be adjusted');

  const balance =
    amount > 0
      ? await creditBucket(targetId, amount, 'adjustment', { note: note ?? `Admin adjustment by ${me}` })
      : await debitBucket(targetId, -amount, 'adjustment', { note: note ?? `Admin adjustment by ${me}` });

  await createNotification(targetId, {
    type: 'system',
    title: amount > 0 ? 'Bucket topped up' : 'Bucket adjusted',
    body: amount > 0
      ? `Support added ${amount.toLocaleString()} SYP to your bucket.`
      : `Support adjusted your bucket by ${(-amount).toLocaleString()} SYP.`,
    data: {},
  });

  res.json({ bucketBalance: balance });
});

export const bucketOverview = asyncHandler(async (_req, res) => {
  const transactions = await BucketTransaction.find().sort({ createdAt: -1 }).limit(50);
  res.json({
    transactions: transactions.map((t) => ({
      id: String(t._id),
      userId: t.user ? String(t.user) : null,
      type: t.type,
      amount: t.amount,
      note: t.note ?? null,
      balanceAfter: t.balanceAfter ?? null,
      createdAt: t.createdAt,
    })),
  });
});
