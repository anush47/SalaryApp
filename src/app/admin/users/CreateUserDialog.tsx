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
import { useSnackbar } from "@/app/contexts/SnackbarContext";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function CreateUserDialog({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [formVisible, setFormVisible] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);

  const createUserMutation = useMutation({
    mutationFn: async (newUser: any) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.message && data.message.startsWith("E11000")) {
          throw new Error("Email already exists");
        }
        throw new Error(data.message || "An error occurred");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSnackbar({
        message: `${data.user.name} created successfully`,
        severity: "success",
      });
      setFormVisible(false);
    },
    onError: (error: Error) => {
      showSnackbar({ message: error.message, severity: "error" });
    },
  });

  const handleClose = () => {
    setOpen(false);
    if (formVisible === false) {
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
    setFormVisible(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const formJson = Object.fromEntries(formData.entries());
    const { name, email, password } = formJson;
    await createUserMutation.mutateAsync({ name, email, password });
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
            <DialogActions>
              <Button onClick={handleClose}>OK</Button>
            </DialogActions>
          </Box>
        )}
      </DialogContent>
      {formVisible && (
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <LoadingButton
            loading={createUserMutation.isPending}
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
