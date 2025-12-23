import { NextRequest } from "next/server";
import Purchase from "@/app/models/Purchase";
import Company from "@/app/models/Company";
import { purchaseSchema, purchaseUpdateSchema } from "@/app/lib/schemas";
import {
    getPaginationParams,
    createPaginatedResponse,
    getTotalCount,
} from "@/app/lib/pagination";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";

export class PurchaseService {
    /**
     * Calculate monthly price based on company and employee count
     */
    static calculateMonthlyPrice(
        company: any,
        employeeCount: number,
        activeEmployeeCount: number
    ): number {
        if (company === null) {
            return 2000;
        }
        if (company.monthlyPriceOverride) {
            return company.monthlyPrice;
        }
        const basePrice = 3000; // Base price for up to 5 employees
        const additionalPricePerFiveEmployees = 500; // Additional price for each set of 5 employees

        const employeeGroups = Math.ceil(activeEmployeeCount / 5);
        const totalPrice =
            basePrice + (employeeGroups - 1) * additionalPricePerFiveEmployees;

        return totalPrice;
    }

    /**
     * Calculate total price for a set of months
     */
    static calculateTotalPrice(company: any, months: string[]) {
        const pricePerMonth = company.monthlyPrice;
        const noOfMonths = months.length;
        const totalPrice = pricePerMonth * noOfMonths;
        const finalTotalPrice = noOfMonths >= 3 ? totalPrice * 0.9 : totalPrice;
        return { totalPrice, finalTotalPrice };
    }

    /**
     * Check if a company has purchased a subscription for a given period
     */
    static async checkPurchased(companyId: string, period: string) {
        const purchases = await Purchase.find({
            company: companyId,
        });

        if (!purchases || purchases.length === 0) {
            return "unavailable";
        }

        const periodFormatted = `${period.split("-")[1]}-${period.split("-")[0]}`;
        let found = false;

        for (const purchase of purchases) {
            if (purchase.periods) {
                for (const p of purchase.periods) {
                    if (p === periodFormatted || p === period) {
                        found = true;
                        if (purchase.approvedStatus !== "declined")
                            return purchase.approvedStatus;
                    }
                }
            }
        }

        if (!found) return "unavailable";

        return "declined";
    }

    /**
     * Get purchases with filtering and pagination
     */
    static async getPurchases(req: NextRequest, context: any) {
        const { user } = context;
        const purchaseId = req.nextUrl.searchParams.get("purchaseId");
        const companyId = req.nextUrl.searchParams.get("companyId");

        if (purchaseId) {
            const purchase = await Purchase.findById(purchaseId);

            if (!purchase) {
                return ApiResponseUtils.sendNotFound("Purchase not found");
            }

            // Create filter
            const filter = { user: user.id, _id: purchase.company };
            if (user.role === "admin") {
                delete (filter as { user?: string }).user;
            }

            const company = await Company.findOne(filter);
            if (!company) {
                return ApiResponseUtils.sendForbidden("Access denied.");
            }

            const enrichedPurchase = {
                ...purchase._doc,
                companyName: company.name,
                companyEmployerNo: company.employerNo,
            };

            return ApiResponseUtils.sendSuccess({ purchase: enrichedPurchase });
        } else if (companyId) {
            const companyFilter = { user: user.id, _id: companyId };
            if (user.role === "admin") {
                delete (companyFilter as { user?: string }).user;
            }

            const { page, limit, skip } = getPaginationParams(req);

            if (companyId !== "all") {
                const company = await Company.findOne(companyFilter);

                if (!company) {
                    return ApiResponseUtils.sendNotFound("Company not found");
                }

                const filter = { company: company._id || "" };

                const purchases = await Purchase.find(filter)
                    .select("-request")
                    .skip(skip)
                    .limit(limit)
                    .lean();

                const total = await getTotalCount(Purchase, filter);

                const enrichedPurchases = purchases.map((purchase) => ({
                    ...purchase,
                    companyName: company.name,
                    companyEmployerNo: company.employerNo,
                }));

                const response = createPaginatedResponse(
                    enrichedPurchases,
                    page,
                    limit,
                    total
                );
                return ApiResponseUtils.sendSuccess({
                    ...response,
                    purchases: response.data,
                });
            } else {
                // companyId === "all"
                const purchases = await Purchase.find()
                    .skip(skip)
                    .limit(limit)
                    .lean();

                const total = await getTotalCount(Purchase, {});

                const companies = await Company.find()
                    .select("_id name employerNo")
                    .lean();

                const purchasesWithCompanyDetails = purchases.map((purchase) => {
                    const company = companies.find(
                        (comp) => String(comp._id) === String(purchase.company)
                    );
                    return {
                        ...purchase,
                        request: purchase.request ? true : false,
                        companyName: company?.name,
                        companyEmployerNo: company?.employerNo,
                    };
                });

                const response = createPaginatedResponse(
                    purchasesWithCompanyDetails,
                    page,
                    limit,
                    total
                );
                return ApiResponseUtils.sendSuccess({
                    ...response,
                    purchases: response.data,
                });
            }
        } else {
            return ApiResponseUtils.sendBadRequest(
                "Purchase ID or Company ID is required"
            );
        }
    }

    /**
     * Create a new purchase
     */
    static async createPurchase(body: any, context: any) {
        const { user } = context;

        body.approvedStatus = "pending";
        const today = new Date();
        const date = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear();

        body.requestDay = `${date}-${month}-${year}`;
        body.totalPrice = 0;

        let parsedBody = purchaseSchema.parse(body);

        const filter: { user?: string; _id: string } = {
            user: user.id,
            _id: parsedBody.company,
        };
        if (user.role === "admin") {
            delete filter.user;
        }

        const company = await Company.findOne(filter);
        if (!company) {
            return ApiResponseUtils.sendForbidden("Access denied.");
        }

        parsedBody.totalPrice = PurchaseService.calculateTotalPrice(
            company,
            body.periods
        ).finalTotalPrice;

        // Re-validate to ensure totalPrice is correct
        parsedBody = purchaseSchema.parse(parsedBody);

        const newPurchase = await Purchase.create(parsedBody);
        return ApiResponseUtils.sendSuccess({
            message: "Purchase created successfully",
            purchase: newPurchase,
        });
    }

    /**
     * Update a purchase
     */
    static async updatePurchase(body: any, context: any) {
        const { user } = context;

        if (user.role !== "admin") {
            return ApiResponseUtils.sendForbidden("Access denied");
        }

        const parsedBody = purchaseUpdateSchema.parse(body);
        if (parsedBody.request == "delete") {
            parsedBody.request = null;
        }

        const existingPurchase = await Purchase.findById(parsedBody._id);
        if (!existingPurchase) {
            return ApiResponseUtils.sendNotFound("Purchase not found");
        }

        const company = await Company.findById(existingPurchase.company);
        if (!company) {
            return ApiResponseUtils.sendForbidden("Access denied.");
        }

        // Check if attachmentKey is changing/removed and delete old file
        if (
            (parsedBody.attachmentKey === null || (parsedBody.attachmentKey && parsedBody.attachmentKey !== existingPurchase.attachmentKey)) &&
            existingPurchase.attachmentKey
        ) {
            try {
                const { StorageService } = require("@/app/lib/services/storageService"); // Dynamic import or top-level if possible
                await StorageService.deleteFile(existingPurchase.attachmentKey);
            } catch (err) {
                console.error("Failed to delete old file from R2:", err);
                // Non-blocking error
            }
        }

        const updatedPurchase = await Purchase.findByIdAndUpdate(
            parsedBody._id,
            parsedBody,
            {
                new: true,
                runValidators: true,
            }
        ).lean();

        if (!updatedPurchase) {
            return ApiResponseUtils.sendInternalError("Failed to update purchase");
        }

        return ApiResponseUtils.sendSuccess({
            message: "Purchase updated successfully",
            purchase: updatedPurchase,
        });
    }

    /**
     * Delete a purchase
     */
    static async deletePurchase(req: NextRequest, context: any) {
        const { user } = context;
        const purchaseId = req.nextUrl.searchParams.get("purchaseId");

        if (user.role !== "admin") {
            return ApiResponseUtils.sendForbidden("Access denied");
        }

        if (!purchaseId) {
            return ApiResponseUtils.sendBadRequest("Purchase ID is required");
        }

        const existingPurchase = await Purchase.findById(purchaseId);
        if (!existingPurchase) {
            return ApiResponseUtils.sendNotFound("Purchase not found");
        }

        const company = await Company.findById(existingPurchase.company);
        if (!company) {
            return ApiResponseUtils.sendForbidden("Access denied.");
        }

        const deletedPurchase = await Purchase.findByIdAndDelete(purchaseId);

        if (!deletedPurchase) {
            return ApiResponseUtils.sendInternalError("Failed to delete purchase");
        }

        return ApiResponseUtils.sendSuccess({
            message: "Purchase deleted successfully",
            purchase: deletedPurchase,
        });
    }
}
