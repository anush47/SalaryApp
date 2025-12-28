"use client";
import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUser } from "@/app/lib/api";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  CardHeader,
} from "@mui/material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { Save, Add, Delete } from "@mui/icons-material";

interface UserProps {
  user: {
    name: string;
    email: string;
    id: string;
    role: string;
  };
}

const ProfileForm: React.FC<UserProps> = ({ user }) => {
  const { showSnackbar } = useSnackbar();
  const [userData, setUserData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);

  const { data: fetchedUser, isLoading, isError, error } = useQuery({
    queryKey: ["user", user.id],
    queryFn: () => fetchUser(user.id),
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  useEffect(() => {
    if (fetchedUser) {
      setUserData(fetchedUser);
    }
  }, [fetchedUser]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setUserData({ ...userData, [name]: value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/users`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      queryClient.invalidateQueries({ queryKey: ["user", user.id] });
      showSnackbar({ message: "Profile updated successfully", severity: "success" });
    } catch (error: any) {
      showSnackbar({ message: error.message, severity: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  if (isError) {
    return <Alert severity="error">{error?.message || "Could not load user data."}</Alert>;
  }

  if (!userData) {
    return <Alert severity="error">Could not load user data.</Alert>;
  }

  return (
    <Box>
      <Card
        sx={{
          minHeight: { xs: "calc(100vh - 57px)", sm: "calc(100vh - 64px)" },
          overflowY: "auto",
        }}
      >
        <CardHeader
          title={
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
              }}
            >
              <Typography variant="h4" component="h1">
                My Profile
              </Typography>
              <Button
                variant="outlined"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </Box>
          }
        />
        <CardContent sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Name"
                name="name"
                value={userData.name || ""}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                value={userData.email || ""}
                disabled
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={userData.phoneNumber || ""}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={userData.address || ""}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </Grid>

            {isEditing && (
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? <CircularProgress size={24} /> : "Save Changes"}
                </Button>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfileForm;
