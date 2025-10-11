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
                <ListItem>
                  <ListItemText
                    primary="Payment Structure"
                    secondary={employeeData.overrides?.paymentStructure ? "Employee Specific" : "Company Default"}
                  />
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary="Additions" />
                </ListItem>
                {(employeeData.overrides?.paymentStructure
                  ? employeeData.paymentStructure?.additions
                  : employeeData.company?.paymentStructure?.additions
                )?.map((a: any, index: number) => (
                  <ListItem key={`addition-${index}`} sx={{ pl: 4 }}>
                    <ListItemText
                      primary={a.name}
                      secondary={typeof a.amount === 'number' ? `LKR ${a.amount.toLocaleString()}` : 'Dynamic'}
                    />
                  </ListItem>
                )) || <ListItem sx={{ pl: 4 }}><ListItemText secondary="None" /></ListItem>}
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary="Deductions" />
                </ListItem>
                {(employeeData.overrides?.paymentStructure
                  ? employeeData.paymentStructure?.deductions
                  : employeeData.company?.paymentStructure?.deductions
                )?.map((d: any, index: number) => (
                  <ListItem key={`deduction-${index}`} sx={{ pl: 4 }}>
                    <ListItemText
                      primary={d.name}
                      secondary={typeof d.amount === 'number' ? `LKR ${d.amount.toLocaleString()}` : 'Dynamic'}
                    />
                  </ListItem>
                )) || <ListItem sx={{ pl: 4 }}><ListItemText secondary="None" /></ListItem>}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


    </Box>
  );
};

export default EmployeeProfile;
