
import SalaryAdvance from "@/app/models/SalaryAdvance";

export interface AdvanceDeduction {
    advanceId: string;
    deductionAmount: number;
    monthlyDeduction?: number;
    remainingBalance?: number;
    // adding _id for consistency with mongoose subdocs
    _id?: string;
}

export async function getActiveAdvances(
    employeeId: string,
    period: string
): Promise<AdvanceDeduction[]> {
    const advances = await SalaryAdvance.find({
        employee: employeeId,
        status: "active",
        remainingBalance: { $gt: 0 },
        deductionStartPeriod: { $lte: period },
    }).sort({ advanceDate: 1 }).lean();

    const result = advances.map((adv) => ({
        advanceId: adv._id.toString(),
        deductionAmount: Math.min(Number(adv.monthlyDeduction) || 0, Number(adv.remainingBalance) || 0),
        monthlyDeduction: Number(adv.monthlyDeduction) || 0,
        remainingBalance: Number(adv.remainingBalance) || 0,
    }));
    return result;
}

/**
 * Apply advance deductions to a salary and update advance records
 * Updates the Ledger (SalaryAdvance documents).
 */
export async function applyAdvanceDeductions(
    salaryId: string,
    advances: AdvanceDeduction[]
): Promise<number> {
    let totalDeducted = 0;

    console.log(`[AdvanceDeduction] applyAdvanceDeductions for Salary ${salaryId}. Advances:`, JSON.stringify(advances));
    for (const { advanceId, deductionAmount } of advances) {
        const advance = await SalaryAdvance.findById(advanceId);
        if (!advance) {
            console.warn(`Advance ${advanceId} not found, skipping deduction`);
            continue;
        }

        // Update advance record
        const dedAmount = Number(deductionAmount) || 0;
        advance.totalDeducted = (Number(advance.totalDeducted) || 0) + dedAmount;
        advance.remainingBalance = (Number(advance.remainingBalance) || 0) - dedAmount;
        advance.relatedPayments.push(salaryId as any);

        // Update status if fully deducted
        if (advance.remainingBalance <= 0) {
            advance.status = "fully_deducted";
            advance.remainingBalance = 0; // Ensure no negative balance
        }

        console.log(`[AdvanceDeduction] Applying deduction ${dedAmount} to Advance ${advanceId}. Old Balance: ${advance.remainingBalance + dedAmount}, New Balance: ${advance.remainingBalance}, Total Deducted: ${advance.totalDeducted}`);
        await advance.save();
        totalDeducted += dedAmount;
    }

    return totalDeducted;
}

/**
 * Rollback advance deductions (for salary deletion/update scenarios)
 * Reverses the Ledger updates.
 */
export async function rollbackAdvanceDeductions(
    salaryId: string,
    advances: AdvanceDeduction[]
): Promise<void> {
    console.log(`[AdvanceDeduction] rollbackAdvanceDeductions for Salary ${salaryId}. Advances:`, JSON.stringify(advances));
    for (const { advanceId, deductionAmount } of advances) {
        const advance = await SalaryAdvance.findById(advanceId);
        if (!advance) {
            continue;
        }

        // Reverse the deduction
        const dedAmount = Number(deductionAmount) || 0;
        advance.totalDeducted = (Number(advance.totalDeducted) || 0) - dedAmount;
        advance.remainingBalance = (Number(advance.remainingBalance) || 0) + dedAmount;

        // Ensure no negative values after reversal (though mathematically shouldn't happen if logic consistent)
        if (advance.totalDeducted < 0) advance.totalDeducted = 0;

        // Remove salary from related payments
        advance.relatedPayments = advance.relatedPayments.filter(
            (id) => id.toString() !== salaryId
        );

        // Reactivate if it was marked as fully deducted
        if (advance.status === "fully_deducted" && advance.remainingBalance > 0) {
            advance.status = "active";
        }

        console.log(`[AdvanceDeduction] Rolled back ${dedAmount} from Advance ${advanceId}. New Balance: ${advance.remainingBalance}`);
        await advance.save();
    }
}

/**
 * Reconcile a target total advance amount against a list of active advances.
 * Used when the user manually inputs a flat "Advance Amount" (e.g., 150) and we need to 
 * distribute it across the detailed advance records.
 */
export function reconcileAdvances(
    baseAdvances: AdvanceDeduction[],
    targetAmount: number
): AdvanceDeduction[] {
    const totalAdvanceDetail = baseAdvances.reduce((sum, adv) => sum + (Number(adv.deductionAmount) || 0), 0);

    // Exact match: return base (or deep copy of base)
    if (Math.abs(totalAdvanceDetail - targetAmount) <= 0.01) {
        return baseAdvances.map(a => ({ ...a, deductionAmount: Number(a.deductionAmount) }));
    }

    console.log(`[AdvanceDeduction] Reconciling with FIFO: Current sum (${totalAdvanceDetail}) -> Target (${targetAmount})`);

    // Clone base advances with 0 deduction amount initially
    const reconciled = baseAdvances.map(a => ({
        ...a,
        deductionAmount: 0
    }));

    let remainingToDistribute = targetAmount;

    for (const adv of reconciled) {
        if (remainingToDistribute <= 0) break;

        // Determine how much we CAN deduct from this advance
        // If we have remainingBalance from the DB/state, use it as a cap
        let maxAvailable = Number(adv.remainingBalance) || Infinity;

        // If it's the last advance and we still have money to distribute, 
        // we might allow over-deducting or just stop? 
        // In reality, remainingBalance should be accurate.

        const deduction = Math.min(remainingToDistribute, maxAvailable);
        adv.deductionAmount = Math.round(deduction * 100) / 100;

        remainingToDistribute -= adv.deductionAmount;
        remainingToDistribute = Math.round(remainingToDistribute * 100) / 100;
    }

    // If there's still money remaining after going through all active advances
    // (e.g. user entered 500 but total debt is 400), assign the rest to the last advance
    // This allows "over-deducting" or creating a positive balance if the system allows.
    if (remainingToDistribute > 0 && reconciled.length > 0) {
        reconciled[reconciled.length - 1].deductionAmount += remainingToDistribute;
    }

    return reconciled;
}

/**
 * Calculate total advance deduction amount for a period
 */
export function calculateTotalAdvanceDeduction(advances: AdvanceDeduction[]): number {
    return advances.reduce((sum, adv) => sum + (Number(adv.deductionAmount) || 0), 0);
}
