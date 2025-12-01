import { apiFetch } from "./commonApi";

export const generatePdf = async (
    companyId: string,
    period: string,
    pdfType: string,
    salaryIds?: string[]
): Promise<Blob> => {
    const response = await fetch("/api/pdf", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            companyId,
            period,
            pdfType,
            salaryIds,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate PDF");
    }

    return await response.blob();
};
