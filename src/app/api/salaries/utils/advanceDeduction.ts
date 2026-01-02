import SalaryAdvance from "@/app/models/SalaryAdvance";

interface AdvanceDeduction {
    advanceId: string;
    deductionAmount: number;
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

    return advances.map((adv) => ({
        advanceId: adv._id.toString(),
        deductionAmount: Math.min(adv.monthlyDeduction, adv.remainingBalance),
    }));
}

/**
 * Apply advance deductions to a salary and update advance records
 */
export async function applyAdvanceDeductions(
    salaryId: string,
    advances: AdvanceDeduction[]
): Promise<number> {
    let totalDeducted = 0;

    for (const { advanceId, deductionAmount } of advances) {
        const advance = await SalaryAdvance.findById(advanceId);
        if (!advance) {
            console.warn(`Advance ${advanceId} not found, skipping deduction`);
            continue;
        }

        // Update advance record
        advance.totalDeducted += deductionAmount;
        advance.remainingBalance -= deductionAmount;
        advance.relatedPayments.push(salaryId as any);

        // Update status if fully deducted
        if (advance.remainingBalance <= 0) {
            advance.status = "fully_deducted";
            advance.remainingBalance = 0; // Ensure no negative balance
        }

        await advance.save();
        totalDeducted += deductionAmount;
    }

    return totalDeducted;
}

/**
 * Calculate total advance deduction amount for a period
 */
export function calculateTotalAdvanceDeduction(advances: AdvanceDeduction[]): number {
    return advances.reduce((sum, adv) => sum + adv.deductionAmount, 0);
}

/**
 * Rollback advance deductions (for salary deletion/update scenarios)
 */
export async function rollbackAdvanceDeductions(
    salaryId: string,
    advances: AdvanceDeduction[]
): Promise<void> {
    for (const { advanceId, deductionAmount } of advances) {
        const advance = await SalaryAdvance.findById(advanceId);
        if (!advance) {
            continue;
        }

        // Reverse the deduction
        advance.totalDeducted -= deductionAmount;
        advance.remainingBalance += deductionAmount;

        // Remove salary from related payments
        advance.relatedPayments = advance.relatedPayments.filter(
            (id) => id.toString() !== salaryId
        );

        // Reactivate if it was marked as fully deducted
        if (advance.status === "fully_deducted" && advance.remainingBalance > 0) {
            advance.status = "active";
        }

        await advance.save();
    }
}
