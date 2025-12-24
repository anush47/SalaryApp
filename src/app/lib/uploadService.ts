export interface UploadResult {
    key: string;
    filename: string;
}

export interface UploadConfig {
    file: File;
    folder: string;
    entityId: string;
    companyId: string;
}

export const uploadFile = async ({ file, folder, entityId, companyId }: UploadConfig): Promise<UploadResult> => {
    // 1. Request Presigned URL
    const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            folder,
            entityId,
            companyId
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to get upload URL");
    }

    const { uploadUrl, key } = data.data || data;

    // 2. Upload to R2
    const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
            'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
    });

    if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage.");
    }

    return { key, filename: file.name };
};
