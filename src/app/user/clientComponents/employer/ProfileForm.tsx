"use client";
import React, { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/users?me=true`);
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        const data = await response.json();
        setUserData(data.users[0]);
      } catch (error: any) {
        showSnackbar({ message: error.message, severity: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user.id]);

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

      showSnackbar({ message: "Profile updated successfully", severity: "success" });
    } catch (error: any) {
      showSnackbar({ message: error.message, severity: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (!userData) {
    return <Alert severity="error">Could not load user data.</Alert>;
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" gutterBottom>
          My Profile
        </Typography>
        <Button 
          variant="outlined" 
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </Box>
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
