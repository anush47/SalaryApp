"use client";
import { AccountCircle, Edit, AlternateEmail, Done } from "@mui/icons-material";
import {
  FormControl,
  TextField,
  InputAdornment,
  IconButton,
  Button,
} from "@mui/material";
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import ChangePasswordDialog from "./changePasswordDialog";
import { LoadingButton } from "@mui/lab";
import { useSnackbar } from "@/app/context/SnackbarContext"; // Import useSnackbar

const EditForm = ({
  user,
}: {
  user: { id: string; name: string; email: string };
}) => {
  const [name, setName] = useState(user.name);
  const [disabled, setDisabled] = useState(true);
  const { showSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: session, update } = useSession();

  const handleEdit = () => {
    setDisabled(false);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleSave = async () => {
    if (name === user.name) {
      setDisabled(true);
      return;
    }
    setLoading(true);

    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: user.id, name }),
      });

      if (!response.ok) {
        throw new Error("Failed to update name");
      }

      const data = await response.json();

      // Update the session
      update({ user: { ...session?.user, name: data.user.name } });

      showSnackbar({
        message: "Name updated successfully!",
        severity: "success",
      });
      setDisabled(true);
    } catch (error) {
      showSnackbar({
        message: "Error updating name. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FormControl fullWidth sx={{ mb: 3, gap: 3 }}>
        <TextField
          fullWidth
          error={name === ""}
          helperText={name === "" ? "Name cannot be empty" : null}
          required
          label="Name"
          value={name}
          onChange={handleNameChange}
          InputProps={{
            readOnly: disabled,
            startAdornment: (
              <InputAdornment position="start">
                <AccountCircle />
              </InputAdornment>
            ),
            endAdornment: disabled ? (
              <InputAdornment position="end">
                <IconButton onClick={handleEdit}>
                  <Edit color="primary" />
                </IconButton>
              </InputAdornment>
            ) : (
              name !== "" && (
                <InputAdornment position="end">
                  <LoadingButton
                    variant="outlined"
                    color="success"
                    loading={loading}
                    startIcon={<Done />}
                    loadingPosition="start"
                    onClick={handleSave}
                  >
                    <span>Save</span>
                  </LoadingButton>
                </InputAdornment>
              )
            ),
          }}
        />
        <TextField
          fullWidth
          required
          label="Email"
          defaultValue={user?.email}
          InputProps={{
            readOnly: true,
            startAdornment: (
              <InputAdornment position="start">
                <AlternateEmail />
              </InputAdornment>
            ),
          }}
        />
      </FormControl>
      <Button variant="outlined" color="error" onClick={() => setOpen(true)}>
        Change Password
      </Button>
      {open && <ChangePasswordDialog open={open} setOpen={setOpen} />}
    </>
  );
};

export default EditForm;
