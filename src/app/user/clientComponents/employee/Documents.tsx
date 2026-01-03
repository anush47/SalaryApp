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
  isAdmin?: boolean;
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
  isAdmin = false,
  manualUpload
}) => {
  const [newDocName, setNewDocName] = useState("");
  const [newDocKey, setNewDocKey] = useState("");
  // Local state for file selected in "Add" section (for manual mode)
  const [selectedAddFile, setSelectedAddFile] = useState<File | null>(null);

  const handleAddDocument = (overrideName?: string, overrideFile?: File) => {
    const name = (overrideName || newDocName).trim();
    const file = overrideFile || selectedAddFile;

    if (name) {
      if (manualUpload && file) {
        // Validation: Check if name exists in docs or pending
        // if (documents[name] || manualUpload.pendingFiles[name]) {
        //   return;
        // }
        manualUpload.setPendingFiles({
          ...manualUpload.pendingFiles,
          [name]: file
        });
        setNewDocName("");
        setSelectedAddFile(null);
      } else if (isAdmin && !file && setDocuments) {
        // Admin mode: add placeholder without file
        const updatedDocuments = {
          ...documents,
          [name]: "",
        };
        setDocuments(updatedDocuments);
        setNewDocName("");
      } else if (setDocuments && newDocKey) {
        // Immediate mode
        const updatedDocuments = {
          ...documents,
          [name]: newDocKey.trim(),
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
              <Box>
                {manualUpload?.pendingFiles[name] ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="primary" noWrap sx={{ maxWidth: 150 }}>
                      {manualUpload.pendingFiles[name].name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      (Ready)
                    </Typography>
                    <IconButton size="small" onClick={() => handleRemoveDocument(name, true)} color="error">
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="caption" color="error">
                      File missing
                    </Typography>
                    {editable && !isAdmin && (
                      <FileUpload
                        folder="employees"
                        entityId={employeeId}
                        companyId={companyId}
                        mode="manual"
                        onFileSelect={(file) => {
                          manualUpload?.setPendingFiles({
                            ...manualUpload.pendingFiles,
                            [name]: file
                          });
                        }}
                        label="Upload"
                        maxSizeMB={10}
                        accept="image/*,application/pdf"
                      />
                    )}
                  </Box>
                )}
              </Box>
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

      {/* Pending (Unsaved) Documents - Only those that aren't matching existing names */}
      {manualUpload && Object.entries(manualUpload.pendingFiles)
        .filter(([name]) => !documents.hasOwnProperty(name))
        .map(([name, file]) => (
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

            {/* Manual Mode: Show selected file (only for Admin or if auto-add not triggered) */}
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
                  if (!isAdmin) {
                    handleAddDocument(newDocName || filename, undefined);
                  } else {
                    setNewDocKey(key);
                    if (!newDocName) setNewDocName(filename);
                  }
                }}
                onFileSelect={(file) => {
                  if (!isAdmin) {
                    handleAddDocument(newDocName || file.name, file);
                  } else {
                    setSelectedAddFile(file);
                    if (!newDocName) setNewDocName(file.name);
                  }
                }}
                label="Upload Doc"
                maxSizeMB={10}
                accept="image/*,application/pdf"
              />
            )}
          </Grid>
          <Grid item xs={2}>
            {/* Add button - for admin it allows name-only, for employee it's mostly fallback if auto-add failed */}
            <Button
              variant="contained"
              onClick={() => handleAddDocument()}
              disabled={!newDocName.trim() || (!isAdmin && !newDocKey && !selectedAddFile)}
              startIcon={<Add />}
              size="small"
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