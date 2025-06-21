"use client";
import { AccountCircle, Edit, AlternateEmail, Done } from "@mui/icons-material";
import {
  FormControl,
  TextField,
  InputAdornment,
  IconButton,
  // Alert, // Removed if only for snackbar
  // Collapse, // Removed if only for snackbar
  Box, // Keep Box if used for other layout
  Button,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useSession } from "next-auth/react";
import ChangePasswordDialog from "./changePasswordDialog";
import { LoadingButton } from "@mui/lab";
import { useSnackbar } from "@/app/contexts/SnackbarContext"; // Import useSnackbar

const EditForm = ({
  user,
}: {
  user: { id: string; name: string; email: string };
}) => {
  const [name, setName] = useState(user.name);
  const [disabled, setDisabled] = useState(true);
  const { showSnackbar } = useSnackbar(); // Use the snackbar hook
  // const [alertOpen, setAlertOpen] = useState(false); // Removed
  // const [alertMessage, setAlertMessage] = useState(""); // Removed
  // const [alertSeverity, setAlertSeverity] = useState<"success" | "error">("success"); // Removed
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

      console.log("Name updated successfully:", data);

      // Update the session
      update({ user: { ...session?.user, name: data.user.name } });

      // setAlertMessage("Name updated successfully!"); // Removed
      // setAlertSeverity("success"); // Removed
      // setAlertOpen(true); // Removed
      showSnackbar({
        message: "Name updated successfully!",
        severity: "success",
      });
      setDisabled(true);

      // Hide the alert after 3 seconds - Not needed for global snackbar
      // setTimeout(() => {
      //   setAlertOpen(false);
      // }, 3000);
    } catch (error) {
      console.error("Error updating name:", error);

      // setAlertMessage("Error updating name. Please try again."); // Removed
      // setAlertSeverity("error"); // Removed
      // setAlertOpen(true); // Removed
      showSnackbar({
        message: "Error updating name. Please try again.",
        severity: "error",
      });

      // Hide the alert after 3 seconds - Not needed for global snackbar
      // setTimeout(() => {
      //   setAlertOpen(false);
      // }, 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FormControl fullWidth sx={{ mb: 3, gap: 3 }}>
        {/* Removed Alert and Collapse */}
        {/* <Box sx={{ mb: 2 }}>
          <Collapse in={alertOpen}>
            <Alert severity={alertSeverity}>{alertMessage}</Alert>
          </Collapse>
        </Box> */}
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
