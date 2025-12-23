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
}

const Documents: React.FC<DocumentsProps> = ({
  documents = {},
  setDocuments,
  editable,
  companyId,
  employeeId
}) => {
  const [newDocName, setNewDocName] = useState("");
  const [newDocKey, setNewDocKey] = useState("");

  const handleAddDocument = () => {
    if (newDocName.trim() && setDocuments) {
      const updatedDocuments = {
        ...documents,
        [newDocName.trim()]: newDocKey.trim(),
      };
      setDocuments(updatedDocuments);
      setNewDocName("");
      setNewDocKey("");
    }
  };

  const handleRemoveDocument = (key: string) => {
    if (setDocuments) {
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
              editable ? (
                <FileUpload
                  folder="employees"
                  entityId={employeeId}
                  companyId={companyId}
                  onUploadComplete={(newKey) => {
                    if (setDocuments) {
                      setDocuments({
                        ...documents,
                        [name]: newKey
                      });
                    }
                  }}
                  label="Upload"
                  maxSizeMB={10}
                  accept="image/*,application/pdf"
                />
              ) : (
                <Typography variant="body2" color="text.secondary">No file</Typography>
              )
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
            {newDocKey ? (
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="caption" noWrap sx={{ maxWidth: 150 }}>
                  File Uploaded
                </Typography>
                <IconButton size="small" onClick={() => setNewDocKey("")} color="error">
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <FileUpload
                folder="employees"
                entityId={employeeId}
                companyId={companyId}
                onUploadComplete={(key, filename) => {
                  setNewDocKey(key);
                  if (!newDocName) {
                    setNewDocName(filename);
                  }
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
              disabled={!newDocName.trim()}
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