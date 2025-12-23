import React, { useState } from 'react';
import { Button, CircularProgress, Box, Typography, makeStyles } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { useSnackbar } from '@/app/context/SnackbarContext';
import { styled } from '@mui/material/styles';

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

interface FileUploadProps {
    folder: string; // 'employees' | 'leaves' | 'purchases'
    entityId: string; // ID of the related entity
    companyId: string;
    onUploadComplete: (key: string, filename: string) => void;
    label?: string;
    accept?: string;
    maxSizeMB?: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
    folder,
    entityId,
    companyId,
    onUploadComplete,
    label = "Upload File",
    accept = "*/*", // e.g. "image/*,application/pdf"
    maxSizeMB = 10
}) => {
    const [uploading, setUploading] = useState(false);
    const { showSnackbar } = useSnackbar();

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;

        const file = event.target.files[0];

        // Validate size
        if (file.size > maxSizeMB * 1024 * 1024) {
            showSnackbar({ message: `File size exceeds ${maxSizeMB}MB limit.`, severity: "error" });
            return;
        }

        try {
            setUploading(true);

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

            const { uploadUrl, key } = data.data || data; // Handle ApiResponse structure

            // 2. Upload to R2
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type || 'application/octet-stream' // Required to match signature
                },
                body: file
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload file to storage.");
            }

            // 3. Complete
            onUploadComplete(key, file.name);
            showSnackbar({ message: "File uploaded successfully!", severity: "success" });

        } catch (error: any) {
            console.error(error);
            showSnackbar({ message: error.message || "Upload failed", severity: "error" });
        } finally {
            setUploading(false);
            // Reset input ?
            event.target.value = '';
        }
    };

    return (
        <Button
            component="label"
            variant="outlined" // Or contained, per design
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
            disabled={uploading}
        >
            {label}
            <VisuallyHiddenInput
                type="file"
                onChange={handleFileChange}
                accept={accept}
            />
        </Button>
    );
};
