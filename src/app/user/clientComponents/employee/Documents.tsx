"use client";

import React, { useState } from "react";
import {
  Grid,
  TextField,
  Button,
  Typography,
  IconButton,
  Box,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { FileUpload } from "@/app/components/FileUpload";
import { FileViewer } from "@/app/components/FileViewer";

interface DocumentsProps {
  documents: Record<string, string> | undefined;
  setDocuments?: (documents: Record<string, string>) => void;
  editable: boolean;
  companyId: string;
  employeeId: string;
  manualUpload?: {
    pendingFiles: Record<string, File>;
    setPendingFiles: (files: Record<string, File>) => void;
  };
}

const Documents: React.FC<DocumentsProps> = ({
  documents = {},
  setDocuments,
  editable,
  companyId,
  employeeId,
  manualUpload
}) => {
  const [newDocName, setNewDocName] = useState("");
  const [newDocKey, setNewDocKey] = useState("");
  // Local state for file selected in "Add" section (for manual mode)
  const [selectedAddFile, setSelectedAddFile] = useState<File | null>(null);

  const handleAddDocument = () => {
    if (newDocName.trim()) {
      if (manualUpload && selectedAddFile) {
        // Validation: Check if name exists in docs or pending
        if (documents[newDocName] || manualUpload.pendingFiles[newDocName]) {
          // alert/snackbar? For now just ignore or need error handling props
          return;
        }
        manualUpload.setPendingFiles({
          ...manualUpload.pendingFiles,
          [newDocName.trim()]: selectedAddFile
        });
        setNewDocName("");
        setSelectedAddFile(null);
      } else if (setDocuments && newDocKey) {
        // Immediate mode
        const updatedDocuments = {
          ...documents,
          [newDocName.trim()]: newDocKey.trim(),
        };
        setDocuments(updatedDocuments);
        setNewDocName("");
        setNewDocKey("");
      }
    }
  };

  const handleRemoveDocument = (key: string, isPending: boolean = false) => {
    if (isPending && manualUpload) {
      const updated = { ...manualUpload.pendingFiles };
      delete updated[key];
      manualUpload.setPendingFiles(updated);
    } else if (setDocuments) {
      const updatedDocuments = { ...documents };
      delete updatedDocuments[key];
      setDocuments(updatedDocuments);
    }
  };

  return (
    <div>
      <Typography variant="h6" gutterBottom>
        Documents
      </Typography>

      {/* Existing Saved Documents */}
      {Object.entries(documents).map(([name, key]) => (
        <Grid container spacing={2} key={name} alignItems="center" mb={1}>
          <Grid item xs={5}>
            <TextField
              fullWidth
              label="Document Name"
              value={name}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={5}>
            {key ? (
              <FileViewer fileKey={key} filename={name} showPreview={false} />
            ) : (
              // Should not happen for saved docs usually, but if key is empty
              <Typography variant="body2">No file</Typography>
            )}
          </Grid>
          {editable && (
            <Grid item xs={2}>
              <IconButton
                color="error"
                onClick={() => handleRemoveDocument(name)}
                size="small"
              >
                <Delete />
              </IconButton>
            </Grid>
          )}
        </Grid>
      ))}

      {/* Pending (Unsaved) Documents */}
      {manualUpload && Object.entries(manualUpload.pendingFiles).map(([name, file]) => (
        <Grid container spacing={2} key={`pending-${name}`} alignItems="center" mb={1}>
          <Grid item xs={5}>
            <TextField
              fullWidth
              label="Document Name"
              value={name}
              InputProps={{
                readOnly: true,
              }}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={5}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                {file.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                (Pending Upload)
              </Typography>
            </Box>
          </Grid>
          {editable && (
            <Grid item xs={2}>
              <IconButton
                color="error"
                onClick={() => handleRemoveDocument(name, true)}
                size="small"
              >
                <Delete />
              </IconButton>
            </Grid>
          )}
        </Grid>
      ))}


      {editable && (
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={5}>
            <TextField
              fullWidth
              label="New Document Name"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={5}>
            {/* Immediate Mode: Show uploaded file key */}
            {!manualUpload && newDocKey ? (
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="caption" noWrap sx={{ maxWidth: 150 }}>
                  File Uploaded
                </Typography>
                <IconButton size="small" onClick={() => setNewDocKey("")} color="error">
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ) : null}

            {/* Manual Mode: Show selected file */}
            {manualUpload && selectedAddFile ? (
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="caption" noWrap sx={{ maxWidth: 150 }}>
                  {selectedAddFile.name}
                </Typography>
                <IconButton size="small" onClick={() => setSelectedAddFile(null)} color="error">
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ) : null}

            {/* Upload Button (if no file selected/uploaded yet) */}
            {((!newDocKey && !manualUpload) || (!selectedAddFile && manualUpload)) && (
              <FileUpload
                folder="employees"
                entityId={employeeId}
                companyId={companyId}
                mode={manualUpload ? 'manual' : 'immediate'}
                onUploadComplete={(key, filename) => {
                  setNewDocKey(key);
                  if (!newDocName) setNewDocName(filename);
                }}
                onFileSelect={(file) => {
                  setSelectedAddFile(file);
                  if (!newDocName) setNewDocName(file.name);
                }}
                label="Upload Doc"
                maxSizeMB={10}
                accept="image/*,application/pdf"
              />
            )}
          </Grid>
          <Grid item xs={2}>
            <Button
              variant="contained"
              onClick={handleAddDocument}
              disabled={!newDocName.trim() || (!newDocKey && !selectedAddFile)}
              startIcon={<Add />}
            >
              Add
            </Button>
          </Grid>
        </Grid>
      )}
    </div>
  );
};

export default Documents;