import React, { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, Typography, Link as MuiLink } from '@mui/material';
import { Visibility, Download } from '@mui/icons-material';
import { useSnackbar } from '@/app/context/SnackbarContext';

interface FileViewerProps {
    fileKey: string;
    filename?: string; // Optional display name
    showPreview?: boolean; // Whether to try showing image preview
}

export const FileViewer: React.FC<FileViewerProps> = ({ fileKey, filename, showPreview = true }) => {
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { showSnackbar } = useSnackbar();

    // Determine file type from extension roughly
    const isImage = fileKey.match(/\.(jpeg|jpg|png|gif|webp)$/i);
    const isPdf = fileKey.match(/\.pdf$/i);

    const fetchUrl = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/storage/access?key=${encodeURIComponent(fileKey)}`);
            const data = await response.json();

            if (!response.ok) {
                // Silently fail or show small error? 
                // If forbidden, maybe just don't show button?
                throw new Error(data.message || "Cannot access file");
            }

            const url = data.data?.downloadUrl || data.downloadUrl;
            setDownloadUrl(url);
        } catch (error: any) {
            console.error(error);
            showSnackbar({ message: "Failed to load document access.", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleViewClick = () => {
        if (!downloadUrl) {
            fetchUrl().then(() => {
                // React update will happen, user clicks again? 
                // Better: Fetch on mount if preview is needed, or fetch on click if button.
                // Let's fetch on click to keep tokens fresh? 
                // Actually, for better UX, fetch URL and then open.
            });
        } else {
            window.open(downloadUrl, '_blank');
        }
    };

    // If we want to show an image preview immediately, we should fetch on mount.
    useEffect(() => {
        if (showPreview && isImage) {
            fetchUrl();
        }
    }, [fileKey, showPreview]); // eslint-disable-line react-hooks/exhaustive-deps


    if (loading && showPreview && isImage) {
        return <CircularProgress size={20} />;
    }

    if (showPreview && isImage && downloadUrl) {
        return (
            <Box sx={{ mt: 1, border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden', maxWidth: 200 }}>
                <img src={downloadUrl} alt={filename || "Attachment"} style={{ width: '100%', height: 'auto', display: 'block' }} />
                <Box sx={{ p: 0.5, bgcolor: 'rgba(0,0,0,0.05)', textAlign: 'center' }}>
                    <MuiLink href={downloadUrl} target="_blank" underline="hover" variant="caption">
                        View Full Size
                    </MuiLink>
                </Box>
            </Box>
        );
    }

    return (
        <Button
            variant="text"
            size="small"
            startIcon={<Visibility />}
            onClick={async () => {
                if (!downloadUrl) {
                    setLoading(true);
                    try {
                        const response = await fetch(`/api/storage/access?key=${encodeURIComponent(fileKey)}`);
                        const data = await response.json();
                        if (response.ok) {
                            const url = data.data?.downloadUrl || data.downloadUrl;
                            setDownloadUrl(url);
                            window.open(url, '_blank');
                        } else {
                            showSnackbar({ message: data.message || "Access denied", severity: "error" });
                        }
                    } catch (e) {
                        showSnackbar({ message: "Network error", severity: "error" });
                    } finally {
                        setLoading(false);
                    }
                } else {
                    window.open(downloadUrl, '_blank');
                }
            }}
            disabled={loading}
        >
            {filename || "View Document"} {loading && <CircularProgress size={10} sx={{ ml: 1 }} />}
        </Button>
    );
};
