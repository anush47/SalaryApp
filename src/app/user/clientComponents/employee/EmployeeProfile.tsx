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
  Divider,
  Avatar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  Edit,
  Lock,
  Business,
  Person,
  Email,
  Phone,
  Badge,
  Work,
  CalendarToday,
  AttachMoney,
  Save,
} from "@mui/icons-material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import Documents from "./Documents";

interface UserProps {
  user: {
    name: string;
    email: string;
    id: string;
    role: string;
    image: string;
  };
}

const EmployeeProfile: React.FC<UserProps> = ({ user }) => {
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    // Handle boolean fields that come from checkboxes
    const finalValue = (name === 'isMarried' || name === 'editable') && type === 'checkbox' ? checked : value;
    setEmployeeData({ ...employeeData, [name]: finalValue });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/employees`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      showSnackbar({
        message: "Profile updated successfully",
        severity: "success",
      });
      setIsEditing(false);
    } catch (error: any) {
      showSnackbar({ message: error.message, severity: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch employee data
        const empResponse = await fetch(`/api/employees?user=${user.id}`);
        if (!empResponse.ok) throw new Error("Failed to fetch employee data");
        const empData = await empResponse.json();

        if (!empData.employees || empData.employees.length === 0) {
          throw new Error("Employee profile not found");
        }

        setEmployeeData(empData.employees[0]);
        setLoading(false);
      } catch (error: any) {
        showSnackbar({ message: error.message, severity: "error" });
        setLoading(false);
      }
    };

    fetchData();
  }, [user.id]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!employeeData) {
    return (
      <Box p={3}>
        <Alert severity="error">Employee data not available</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        My Profile
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Header Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={3}>
                <Avatar
                  src={user.image}
                  alt={user.name}
                  sx={{ width: 120, height: 120 }}
                />
                <Box flex={1}>
                  <Typography variant="h4" gutterBottom>
                    {employeeData.name}
                  </Typography>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {employeeData.designation || "Employee"}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Member #{employeeData.memberNo} •{" "}
                    {employeeData.company?.name}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Person color="primary" />
                <Typography variant="h6">Personal Information</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List>
                <ListItem>
                  <ListItemText
                    primary="Full Name"
                    secondary={employeeData.name}
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="NIC"
                    secondary={employeeData.nic || "Not provided"}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Employment Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Work color="primary" />
                <Typography variant="h6">Employment Details</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List>
                <ListItem>
                  <ListItemText
                    primary="Member Number"
                    secondary={employeeData.memberNo}
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="Designation"
                    secondary={employeeData.designation || "Not specified"}
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="Department"
                    secondary={employeeData.department?.name || "Not assigned"}
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="Manager"
                    secondary={employeeData.manager?.name || "Not assigned"}
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="Employee Type"
                    secondary={
                      employeeData.employeeType
                        ? employeeData.employeeType.charAt(0).toUpperCase() +
                          employeeData.employeeType.slice(1)
                        : "Permanent"
                    }
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="Status"
                    secondary={employeeData.active ? "Active" : "Inactive"}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Company Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Business color="primary" />
                <Typography variant="h6">Company Information</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List>
                <ListItem>
                  <ListItemText
                    primary="Company Name"
                    secondary={employeeData.company?.name || "N/A"}
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="Employer Number"
                    secondary={employeeData.company?.employerNo || "N/A"}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Salary Information */}
        {/* New Personal Details Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6">Personal Details</Typography>
                <Button
                  variant="outlined"
                  onClick={() => employeeData.editable && setIsEditing(!isEditing)}
                  disabled={!employeeData.editable}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="fullName"
                    value={employeeData.fullName || ""}
                    onChange={handleInputChange}
                    variant="outlined"
                    InputProps={{
                      readOnly: !isEditing,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    value={employeeData.email || ""}
                    onChange={handleInputChange}
                    variant="outlined"
                    InputProps={{
                      readOnly: !isEditing,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phoneNumber"
                    value={employeeData.phoneNumber || ""}
                    onChange={handleInputChange}
                    variant="outlined"
                    InputProps={{
                      readOnly: !isEditing,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Address"
                    name="address"
                    value={employeeData.address || ""}
                    onChange={handleInputChange}
                    variant="outlined"
                    InputProps={{
                      readOnly: !isEditing,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Mother's Name"
                    name="motherName"
                    value={employeeData.motherName || ""}
                    onChange={handleInputChange}
                    variant="outlined"
                    InputProps={{
                      readOnly: !isEditing,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Father's Name"
                    name="fatherName"
                    value={employeeData.fatherName || ""}
                    onChange={handleInputChange}
                    variant="outlined"
                    InputProps={{
                      readOnly: !isEditing,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={employeeData.isMarried || false}
                        onChange={(e) =>
                          handleInputChange({
                            target: {
                              name: "isMarried",
                              value: e.target.checked,
                            },
                          } as any)
                        }
                        name="isMarried"
                        disabled={!isEditing}
                      />
                    }
                    label="Married"
                  />
                </Grid>
                {employeeData.isMarried && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Spouse's Name"
                      name="spouseName"
                      value={employeeData.spouseName || ""}
                      onChange={handleInputChange}
                      variant="outlined"
                      InputProps={{
                        readOnly: !isEditing,
                      }}
                    />
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nationality"
                    name="nationality"
                    value={employeeData.nationality || ""}
                    onChange={handleInputChange}
                    variant="outlined"
                    InputProps={{
                      readOnly: !isEditing,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Emergency Contact"
                    name="emergencyContact"
                    value={employeeData.emergencyContact || ""}
                    onChange={handleInputChange}
                    variant="outlined"
                    InputProps={{
                      readOnly: !isEditing,
                    }}
                  />
                </Grid>
                
                {/* Documents Section */}
                <Grid item xs={12}>
                  <Documents 
                    documents={employeeData.documents} 
                    setDocuments={(docs) => setEmployeeData({ ...employeeData, documents: docs })} 
                    editable={isEditing} 
                  />
                </Grid>
                
                {isEditing && (
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <CircularProgress size={24} />
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>


      </Grid>
    </Box>
  );
};

export default EmployeeProfile;
