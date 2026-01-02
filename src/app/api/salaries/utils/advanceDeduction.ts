
import SalaryAdvance from "@/app/models/SalaryAdvance";

export interface AdvanceDeduction {
    advanceId: string;
    deductionAmount: number;
    // adding _id for consistency with mongoose subdocs
    _id?: string;
}

/**
 * Get active advances for an employee that should be deducted in the given period
 */
export async function getActiveAdvances(
    employeeId: string,
    period: string
): Promise<AdvanceDeduction[]> {
    const advances = await SalaryAdvance.find({
        employee: employeeId,
        status: "active",
        remainingBalance: { $gt: 0 },
        deductionStartPeriod: { $lte: period },
    }).lean();

    const result = advances.map((adv) => ({
        advanceId: adv._id.toString(),
        deductionAmount: Math.min(Number(adv.monthlyDeduction) || 0, Number(adv.remainingBalance) || 0),
    }));
    console.log(`[AdvanceDeduction] getActiveAdvances for ${employeeId} period ${period}: Found ${advances.length}, Result:`, JSON.stringify(result));
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

    console.log(`[AdvanceDeduction] Reconciling: Detail Sum (${totalAdvanceDetail}) != Target (${targetAmount})`);

    // Clone
    const reconciled = baseAdvances.map(a => ({ ...a, deductionAmount: Number(a.deductionAmount) }));

    if (totalAdvanceDetail === 0) {
        // Base is 0. If we have advances, assign target to first one?
        // Or distribute evenly? Assigning to oldest (first) is standard debt payoff.
        if (reconciled.length > 0) {
            reconciled[0].deductionAmount = targetAmount;
        }
    } else {
        // Proportional distribution
        const ratio = targetAmount / totalAdvanceDetail;
        for (const adv of reconciled) {
            adv.deductionAmount = Math.round(adv.deductionAmount * ratio * 100) / 100;
        }

        // Fix rounding
        const newSum = reconciled.reduce((sum, adv) => sum + adv.deductionAmount, 0);
        const diff = targetAmount - newSum;
        if (Math.abs(diff) > 0.001 && reconciled.length > 0) {
            reconciled[0].deductionAmount += diff;
        }
    }

    return reconciled;
}

/**
 * Calculate total advance deduction amount for a period
 */
export function calculateTotalAdvanceDeduction(advances: AdvanceDeduction[]): number {
    return advances.reduce((sum, adv) => sum + (Number(adv.deductionAmount) || 0), 0);
}
