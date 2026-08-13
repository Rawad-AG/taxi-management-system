import { PayLaterDebt } from '../models/PayLaterDebt.js';
import { BucketTransaction } from '../models/BucketTransaction.js';
import { User } from '../models/User.js';
import { Ride } from '../models/Ride.js';
import { getConfig } from './config.service.js';
import { createNotification } from './notification.service.js';
import { ApiError } from '../utils/ApiError.js';
import { refId } from './rideFlow.service.js';

export interface DebtView {
  id: string;
  rideId: string;
  amount: number;
  dueDate: Date;
  status: string;
  paidAt: Date | null;
  settledNote: string | null;
  createdAt: Date;
}

export function toDebtDTO(d: {
  _id: unknown;
  ride?: unknown;
  amount: number;
  dueDate: unknown;
  status: string;
  paidAt?: unknown;
  settledNote?: string | null;
  createdAt?: unknown;
}) {
  return {
    id: String(d._id),
    rideId: d.ride ? refId(d.ride) : null,
    amount: d.amount,
    dueDate: d.dueDate,
    status: d.status,
    paidAt: d.paidAt ?? null,
    settledNote: d.settledNote ?? null,
    createdAt: d.createdAt,
  };
}

/** Lazy flip of any overdue debts for a customer; returns the flipped ones. */
export async function flipOverdueDebts(customerId: string) {
  const now = new Date();
  const overdue = await PayLaterDebt.find({ customer: customerId, status: 'outstanding', dueDate: { $lt: now } });
  if (overdue.length === 0) return [];
  const ids = overdue.map((d) => d._id);
  await PayLaterDebt.updateMany({ _id: { $in: ids } }, { $set: { status: 'overdue' } });
  const total = overdue.reduce((sum, d) => sum + d.amount, 0);
  await createNotification(customerId, {
    type: 'payLater',
    title: 'Overdue payment',
    body: `You have an overdue payment of ${total.toLocaleString()} SYP. Pay it to keep booking rides.`,
    data: {},
  });
  return overdue;
}

export interface PayLaterStatus {
  eligible: boolean;
  completedRides: number;
  outstandingBalance: number;
  outstandingCount: number;
  overdueBalance: number;
  overdueCount: number;
  blocked: boolean;
  blockedReason: string | null;
}

export async function getPayLaterStatus(customerId: string): Promise<PayLaterStatus> {
  const cfg = getConfig().payLater;
  await flipOverdueDebts(customerId);

  const [completedRides, debts] = await Promise.all([
    Ride.countDocuments({ customer: customerId, status: 'completed' }),
    PayLaterDebt.find({ customer: customerId, status: { $in: ['outstanding', 'overdue'] } }),
  ]);

  const outstandingBalance = debts.filter((d) => d.status === 'outstanding').reduce((s, d) => s + d.amount, 0);
  const outstandingCount = debts.filter((d) => d.status === 'outstanding').length;
  const overdueBalance = debts.filter((d) => d.status === 'overdue').reduce((s, d) => s + d.amount, 0);
  const overdueCount = debts.filter((d) => d.status === 'overdue').length;

  let blocked = false;
  let blockedReason: string | null = null;

  if (overdueCount > 0 && cfg.blockRidesWhenOverdue) {
    blocked = true;
    blockedReason = `You have an overdue payment of ${overdueBalance.toLocaleString()} SYP`;
  } else if (completedRides < cfg.minCompletedRides) {
    blockedReason = `Pay-later needs ${cfg.minCompletedRides} completed rides (you have ${completedRides})`;
  } else if (outstandingBalance + overdueBalance >= cfg.maxOutstandingBalance) {
    blocked = true;
    blockedReason = `Pay-later limit reached (${(outstandingBalance + overdueBalance).toLocaleString()} / ${cfg.maxOutstandingBalance.toLocaleString()} SYP)`;
  } else if (outstandingCount + overdueCount >= cfg.maxOutstandingRides) {
    blocked = true;
    blockedReason = `Pay-later ride limit reached (${outstandingCount + overdueCount} / ${cfg.maxOutstandingRides})`;
  }

  return {
    eligible: !blocked && completedRides >= cfg.minCompletedRides,
    completedRides,
    outstandingBalance,
    outstandingCount,
    overdueBalance,
    overdueCount,
    blocked,
    blockedReason,
  };
}

/** Server-side guard used at booking. Throws with a clear message when pay-later is unavailable. */
export async function assertCanUsePayLater(customerId: string) {
  const status = await getPayLaterStatus(customerId);
  if (!status.eligible) {
    throw ApiError.badRequest(status.blockedReason ?? 'Pay-later is not available for your account');
  }
  return status;
}

export async function assertBucketCovers(customerId: string, amount: number) {
  const user = await User.findById(customerId).select('bucketBalance');
  if (!user) throw ApiError.notFound('User not found');
  if (user.bucketBalance < amount) {
    throw ApiError.badRequest(
      `Insufficient bucket balance (${user.bucketBalance.toLocaleString()} SYP). Add funds to your bucket or choose another payment method.`,
    );
  }
  return user.bucketBalance;
}

export async function creditBucket(
  customerId: string,
  amount: number,
  type: 'deposit' | 'adjustment',
  opts: { rideId?: string; debtId?: string; note?: string },
) {
  if (amount <= 0) throw ApiError.badRequest('Amount must be positive');
  const user = await User.findById(customerId);  if (!user) throw ApiError.notFound('User not found');
  user.bucketBalance = (user.bucketBalance ?? 0) + amount;
  await user.save();
  await BucketTransaction.create({
    user: customerId,
    type,
    amount,
    ride: opts.rideId,
    debt: opts.debtId,
    note: opts.note,
    balanceAfter: user.bucketBalance,
  });
  return user.bucketBalance;
}

export async function debitBucket(
  customerId: string,
  amount: number,
  type: 'ride_payment' | 'debt_payment' | 'adjustment',
  opts: { rideId?: string; debtId?: string; note?: string },
) {
  if (amount <= 0) throw ApiError.badRequest('Amount must be positive');
  const user = await User.findOneAndUpdate(
    { _id: customerId, bucketBalance: { $gte: amount } },
    { $inc: { bucketBalance: -amount } },
    { new: true },
  );
  if (!user) throw ApiError.badRequest('Insufficient bucket balance');
  await BucketTransaction.create({
    user: customerId,
    type,
    amount: -amount,
    ride: opts.rideId,
    debt: opts.debtId,
    note: opts.note,
    balanceAfter: user.bucketBalance,
  });
  return user.bucketBalance;
}

export async function settleRidePayment(ride: InstanceType<typeof Ride>) {
  const method = ride.payment?.method ?? 'cash';
  if (ride.status !== 'completed') return;

  if (method === 'bucket') {
    await debitBucket(refId(ride.customer), ride.fare.total, 'ride_payment', {
      rideId: String(ride._id),
      note: `Ride ${ride._id} fare`,
    });
  } else if (method === 'pay_later') {
    const cfg = getConfig().payLater;
    const dueDate = new Date(Date.now() + cfg.dueDays * 24 * 60 * 60 * 1000);
    const debt = await PayLaterDebt.create({
      customer: ride.customer,
      ride: ride._id,
      amount: ride.fare.total,
      dueDate,
      status: 'outstanding',
    });
    await createNotification(refId(ride.customer), {
      type: 'payLater',
      title: 'Pay-later trip added',
      body: `${ride.fare.total.toLocaleString()} SYP added to your pay-later account. Due ${dueDate.toLocaleDateString('en-GB')}.`,
      data: { debtId: String(debt._id) },
    });
  }
}

export async function listBucketTransactions(customerId: string, limit = 30) {
  return BucketTransaction.find({ user: customerId }).sort({ createdAt: -1 }).limit(limit);
}
