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
} from "@mui/icons-material";
import { useSnackbar } from "@/app/context/SnackbarContext";

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
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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
        showSnackbar(error.message, "error");
        setLoading(false);
      }
    };

    fetchData();
  }, [user.id]);

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword || !currentPassword) {
      showSnackbar("Please fill all password fields", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showSnackbar("New passwords do not match", "error");
      return;
    }

    if (newPassword.length < 4) {
      showSnackbar("Password must be at least 4 characters", "error");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch("/api/auth/changePassword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      showSnackbar("Password changed successfully", "success");
      setPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      showSnackbar(error.message, "error");
    }
    setChangingPassword(false);
  };

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
                    Member #{employeeData.memberNo} • {employeeData.company?.name}
                  </Typography>
                </Box>
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<Lock />}
                    onClick={() => setPasswordDialog(true)}
                  >
                    Change Password
                  </Button>
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
                    primary="Email"
                    secondary={user.email || "Not provided"}
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="Phone Number"
                    secondary={employeeData.phoneNumber || "Not provided"}
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="NIC"
                    secondary={employeeData.nic || "Not provided"}
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="Address"
                    secondary={employeeData.address || "Not provided"}
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
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="EPF Number"
                    secondary={employeeData.epfNo || "Not provided"}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Salary Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <AttachMoney color="primary" />
                <Typography variant="h6">Salary Information</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List>
                <ListItem>
                  <ListItemText
                    primary="Basic Salary"
                    secondary={`LKR ${employeeData.basic?.toLocaleString()}`}
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText
                    primary="Divide By"
                    secondary={employeeData.divideBy || 240}
                  />
                </ListItem>
                <Divider component="li" />
                {employeeData.paymentStructure?.additions && (
                  <>
                    <ListItem>
                      <ListItemText
                        primary="Additions"
                        secondary={
                          employeeData.paymentStructure.additions.length > 0
                            ? employeeData.paymentStructure.additions
                                .map((a: any) => a.name)
                                .join(", ")
                            : "None"
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </>
                )}
                {employeeData.paymentStructure?.deductions && (
                  <ListItem>
                    <ListItemText
                      primary="Deductions"
                      secondary={
                        employeeData.paymentStructure.deductions.length > 0
                          ? employeeData.paymentStructure.deductions
                              .map((d: any) => d.name)
                              .join(", ")
                          : "None"
                      }
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog
        open={passwordDialog}
        onClose={() => setPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handlePasswordChange}
            disabled={changingPassword}
            startIcon={changingPassword ? <CircularProgress size={20} /> : <Lock />}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeProfile;
