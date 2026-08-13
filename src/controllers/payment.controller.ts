import { User } from '../models/User.js';
import { PayLaterDebt } from '../models/PayLaterDebt.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getPayLaterStatus,
  listBucketTransactions,
  toDebtDTO,
  creditBucket,
  debitBucket,
} from '../services/payment.service.js';
import { createNotification } from '../services/notification.service.js';
import type { AuthedRequest } from '../middleware/auth.js';

const userId = (req: unknown) => (req as AuthedRequest).userId;

export const status = asyncHandler(async (req, res) => {
  const me = userId(req);
  const [payLater, bucket, transactions] = await Promise.all([
    getPayLaterStatus(me),
    User.findById(me).select('bucketBalance'),
    listBucketTransactions(me, 20),
  ]);
  res.json({
    bucketBalance: bucket?.bucketBalance ?? 0,
    payLater,
    transactions: transactions.map((t) => ({
      id: String(t._id),
      type: t.type,
      amount: t.amount,
      rideId: t.ride ? String(t.ride) : null,
      note: t.note ?? null,
      balanceAfter: t.balanceAfter ?? null,
      createdAt: t.createdAt,
    })),
  });
});

export const debts = asyncHandler(async (req, res) => {
  const me = userId(req);
  await getPayLaterStatus(me); // triggers lazy overdue flip
  const list = await PayLaterDebt.find({ customer: me }).sort({ createdAt: -1 }).limit(50);
  res.json({ debts: list.map((d) => toDebtDTO(d)) });
});

export const payDebt = asyncHandler(async (req, res) => {
  const me = userId(req);
  const { id } = req.params;
  const debt = await PayLaterDebt.findOne({ _id: id, customer: me });
  if (!debt) throw ApiError.notFound('Debt not found');
  if (debt.status === 'paid' || debt.status === 'waived') {
    throw ApiError.badRequest('This debt is already settled');
  }

  await debitBucket(me, debt.amount, 'debt_payment', {
    debtId: String(debt._id),
    note: `Pay-later debt ${debt._id}`,
  });

  debt.status = 'paid';
  debt.paidAt = new Date();
  debt.paidFromBucket = true;
  debt.settledBy = undefined;
  await debt.save();

  await createNotification(me, {
    type: 'payLater',
    title: 'Debt settled',
    body: `Your pay-later payment of ${debt.amount.toLocaleString()} SYP was settled from your bucket.`,
    data: { debtId: String(debt._id) },
  });

  const balance = await User.findById(me).select('bucketBalance');
  res.json({ debt: toDebtDTO(debt), bucketBalance: balance?.bucketBalance ?? 0 });
});

export const deposit = asyncHandler(async (req, res) => {
  const me = userId(req);
  const { amount } = req.body;
  // Prototype: simulates a payment gateway. No real money moves.
  const balance = await creditBucket(me, amount, 'deposit', {
    note: 'Simulated payment gateway deposit',
  });
  res.status(201).json({ bucketBalance: balance });
});

export const bucketHistory = asyncHandler(async (req, res) => {
  const me = userId(req);
  const transactions = await listBucketTransactions(me, 50);
  res.json({
    bucketBalance: (await User.findById(me).select('bucketBalance'))?.bucketBalance ?? 0,
    transactions: transactions.map((t) => ({
      id: String(t._id),
      type: t.type,
      amount: t.amount,
      rideId: t.ride ? String(t.ride) : null,
      note: t.note ?? null,
      balanceAfter: t.balanceAfter ?? null,
      createdAt: t.createdAt,
    })),
  });
});
