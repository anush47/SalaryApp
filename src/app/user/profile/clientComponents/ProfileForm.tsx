"use client";
import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  FormControlLabel,
  Checkbox,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  InputAdornment,
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
      const response = await fetch(`/api/users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      queryClient.invalidateQueries({ queryKey: ["user", user.id] });
      showSnackbar({
        message: "Profile updated successfully",
        severity: "success",
      });
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
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        My Profile
      </Typography>
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Full Name"
                name="name"
                value={userData.name || ""}
                onChange={handleInputChange}
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
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="NIC"
                name="nic"
                value={userData.nic || ""}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={userData.address || ""}
                onChange={handleInputChange}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mother's Name"
                name="motherName"
                value={userData.motherName || ""}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Father's Name"
                name="fatherName"
                value={userData.fatherName || ""}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={userData.isMarried || false}
                    onChange={(e) =>
                      setUserData({ ...userData, isMarried: e.target.checked })
                    }
                    name="isMarried"
                  />
                }
                label="Married"
              />
            </Grid>
            {userData.isMarried && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Spouse's Name"
                  name="spouseName"
                  value={userData.spouseName || ""}
                  onChange={handleInputChange}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nationality"
                name="nationality"
                value={userData.nationality || ""}
                onChange={handleInputChange}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Documents
              </Typography>
              {userData.documents &&
                Object.entries(userData.documents).map(([key, value]) => (
                  <Grid container spacing={2} key={key} alignItems="center">
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        label="Document Name"
                        value={key}
                        disabled
                      />
                    </Grid>
                    <Grid item xs={5}>
                      <TextField
                        fullWidth
                        label="Link"
                        value={value as string}
                        disabled
                      />
                    </Grid>
                  </Grid>
                ))}
              {/* Add new document fields will be here */}
            </Grid>

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
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfileForm;
