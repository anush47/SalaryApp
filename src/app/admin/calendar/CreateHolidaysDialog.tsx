import * as React from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Box from "@mui/material/Box";
import { LoadingButton } from "@mui/lab";
import IconButton from "@mui/material/IconButton";
import { useSnackbar } from "@/app/contexts/SnackbarContext"; // Import useSnackbar
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function CreateHolidaysDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { showSnackbar } = useSnackbar(); // Use the snackbar hook
  const [formVisible, setFormVisible] = React.useState(true); // Keep to hide form on success
  const [loading, setLoading] = React.useState(false);
  // const [error, setError] = React.useState<string | null>(null); // Removed
  // const [success, setSuccess] = React.useState<string | null>(null); // Removed

  const [showOldPassword, setShowOldPassword] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const handleClose = () => {
    setOpen(false);
    // setError(null); // Removed
    // setSuccess(null); // Removed
    if (formVisible === false) {
      // if form was hidden due to success
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Shorter delay as snackbar is already shown
    }
    setFormVisible(true); // Reset form visibility for the next open
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries(formData.entries());
    const password = formJson.password as string;
    const email = formJson.email as string;
    const name = formJson.name as string;

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.message && data.message.startsWith("E11000")) {
          throw new Error("Email already exists");
        }
        throw new Error(data.message || "An error occurred");
      }

      showSnackbar({
        message: `${data.user.name} created successfully`,
        severity: "success",
      });
      setFormVisible(false); // Hide the form inputs, dialog can be closed or will reload
      // No need to call handleClose here, user will click OK or Cancel
    } catch (error) {
      showSnackbar({ message: (error as Error).message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      PaperProps={{
        component: "form",
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle>Create User</DialogTitle>
      <DialogContent>
        {/* Removed local success/error Alert components */}
        {/* <Box mb={2}>{error && <Alert severity="error">{error}</Alert>}</Box> */}{" "}
        {/* Removed */}
        {formVisible ? (
          <>
            <TextField
              autoFocus
              margin="dense"
              id="name"
              name="name"
              label="Name"
              type="text"
              fullWidth
              variant="standard"
            />
            <TextField
              autoFocus
              margin="dense"
              id="email"
              name="email"
              label="Email"
              type="text"
              fullWidth
              variant="standard"
            />
            <TextField
              required
              margin="dense"
              id="password"
              name="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              variant="standard"
              InputProps={{
                endAdornment: (
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
          </>
        ) : (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "100px",
            }}
          >
            {/* Optionally, keep a simple text message or a placeholder if form is hidden post-success */}
            {/* For now, assume dialog will be closed or reloaded */}
            <DialogActions>
              <Button onClick={handleClose}>OK</Button>
            </DialogActions>
          </Box>
        )}
      </DialogContent>
      {formVisible && ( // Only show Cancel/Create if form is visible
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <LoadingButton
            loading={loading}
            type="submit"
            loadingPosition="center"
          >
            <span> Create User</span>
          </LoadingButton>
        </DialogActions>
      )}
    </Dialog>
  );
}
