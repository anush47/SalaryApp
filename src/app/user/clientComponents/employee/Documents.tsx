"use client";

import React, { useState } from "react";
import {
  Grid,
  TextField,
  Button,
  Typography,
  IconButton,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";

interface DocumentsProps {
  documents: Record<string, string> | undefined;
  setDocuments?: (documents: Record<string, string>) => void;
  editable: boolean;
}

const Documents: React.FC<DocumentsProps> = ({ 
  documents = {}, 
  setDocuments, 
  editable 
}) => {
  const [newDocName, setNewDocName] = useState("");
  const [newDocLink, setNewDocLink] = useState("");

  const handleAddDocument = () => {
    if (newDocName.trim() && newDocLink.trim() && setDocuments) {
      const updatedDocuments = {
        ...documents,
        [newDocName.trim()]: newDocLink.trim(),
      };
      setDocuments(updatedDocuments);
      setNewDocName("");
      setNewDocLink("");
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
      {Object.entries(documents).map(([key, value]) => (
        <Grid container spacing={2} key={key} alignItems="center" mb={1}>
          <Grid item xs={5}>
            <TextField
              fullWidth
              label="Document Name"
              value={key}
              InputProps={{
                readOnly: !editable,
              }}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={5}>
            <TextField
              fullWidth
              label="Document Link"
              value={value as string}
              InputProps={{
                readOnly: !editable,
              }}
              variant="outlined"
              size="small"
            />
          </Grid>
          {editable && (
            <Grid item xs={2}>
              <IconButton
                color="error"
                onClick={() => handleRemoveDocument(key)}
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
            <TextField
              fullWidth
              label="Document Link"
              value={newDocLink}
              onChange={(e) => setNewDocLink(e.target.value)}
              variant="outlined"
              size="small"
            />
          </Grid>
          <Grid item xs={2}>
            <Button
              variant="contained"
              onClick={handleAddDocument}
              disabled={!newDocName.trim() || !newDocLink.trim()}
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