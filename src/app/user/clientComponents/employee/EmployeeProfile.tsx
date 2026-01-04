"use client";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Avatar,
  TextField,
  List,
  ListItem,
  ListItemText,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  Person,
  Business,
  Work,
} from "@mui/icons-material";
import { useSnackbar } from "@/app/context/SnackbarContext";
import Documents from "./Documents";
import { updateEmployee } from "@/app/lib/api/employeeApi";
import { uploadFile } from "@/app/lib/uploadService";

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
  const queryClient = useQueryClient();
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  // 1. Fetch Employee Data
  const {
    data: fetchedEmployee,
    isLoading: loadingEmployee,
    error: employeeError,
  } = useQuery({
    queryKey: ["employee", user.id],
    queryFn: async () => {
      const response = await fetch(`/api/employees?user=${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch employee data");
      const data = await response.json();
      const employees = data.employees || data.data?.employees || [];
      if (employees.length === 0) {
        throw new Error("Employee profile not found");
      }
      return employees[0];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Sync state with fetched data for editing
  useEffect(() => {
    if (fetchedEmployee) {
      setEmployeeData(fetchedEmployee);
    }
  }, [fetchedEmployee]);

  // Mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: updateEmployee,
    onSuccess: (updatedEmployee) => {
      showSnackbar({
        message: "Profile updated successfully",
        severity: "success",
      });
      setIsEditing(false);
      // Invalidate query to refetch fresh data
      queryClient.setQueryData(["employee", user.id], updatedEmployee); // Optimistic update or just set data
      queryClient.invalidateQueries({ queryKey: ["employee", user.id] });
    },
    onError: (error: any) => {
      showSnackbar({ message: error.message, severity: "error" });
    },
  });

  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [documentsStatus, setDocumentsStatus] = useState({ isBusy: false, hasUnaddedFiles: false });

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    // Handle boolean fields that come from checkboxes
    const finalValue =
      (name === "isMarried" || name === "editable") && type === "checkbox"
        ? checked
        : value;
    setEmployeeData({ ...employeeData, [name]: finalValue });
  };

  const handleSave = async () => {
    let currentData = { ...employeeData };

    // Upload pending files
    if (Object.keys(pendingFiles).length > 0) {
      setIsSaving(true);
      try {
        const uploadedDocs = { ...currentData.documents }; // Start with existing docs

        // Iterate and upload
        // We can do parallel uploads
        const uploadPromises = Object.entries(pendingFiles).map(async ([name, file]) => {
          const result = await uploadFile({
            file,
            folder: 'employees',
            entityId: currentData._id,
            companyId: currentData.company?._id || currentData.company
          });
          return { name, key: result.key };
        });

        const results = await Promise.all(uploadPromises);

        results.forEach(({ name, key }) => {
          uploadedDocs[name] = key;
        });

        currentData.documents = uploadedDocs;

        // Clear pending files after successful upload (or handled by onSuccess)
        setPendingFiles({});

      } catch (error: any) {
        showSnackbar({ message: "Failed to upload documents: " + error.message, severity: "error" });
        setIsSaving(false);
        return;
      }
    }

    updateProfileMutation.mutate(currentData, {
      onSettled: () => setIsSaving(false)
    });
  };

  if (loadingEmployee) {
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

  if (employeeError) {
    return (
      <Box p={3}>
        <Alert severity="error">{(employeeError as Error).message}</Alert>
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
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexDirection={{ xs: "column", sm: "row" }}
              gap={2}
            >
              <Typography variant="h4" component="h1">
                My Profile
              </Typography>
            </Box>
          }
        />
        <CardContent
          sx={{ maxWidth: { xs: "100vw", md: "calc(100vw - 240px)" } }}
        >

          <Grid container spacing={3}>
            <Grid item xs={12}>
              {/* Profile Header Card */}

              <Card>
                <CardContent>
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={3}
                    flexDirection={{ xs: "column", sm: "row" }}
                    textAlign={{ xs: "center", sm: "left" }}
                  >
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

            <Grid item xs={12} md={6}>
              <Grid container spacing={3}>
                {/* Personal Information */}
                <Grid item xs={12}>
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

                {/* Company Information */}
                <Grid item xs={12}>
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
              </Grid>
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
                      onClick={() =>
                        employeeData.editable && setIsEditing(!isEditing)
                      }
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
                        setDocuments={(docs) =>
                          setEmployeeData({ ...employeeData, documents: docs })
                        }
                        editable={isEditing}
                        isAdmin={false}
                        companyId={employeeData.company?._id || employeeData.company}
                        employeeId={employeeData._id}
                        manualUpload={{
                          pendingFiles: pendingFiles,
                          setPendingFiles: setPendingFiles
                        }}
                        onStatusChange={setDocumentsStatus}
                      />
                    </Grid>

                    {isEditing && (
                      <Grid item xs={12}>
                        <Button
                          variant="contained"
                          onClick={handleSave}
                          disabled={isSaving || updateProfileMutation.isPending || documentsStatus.isBusy || documentsStatus.hasUnaddedFiles}
                        >
                          {(isSaving || updateProfileMutation.isPending || documentsStatus.isBusy) ? (
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
        </CardContent>
      </Card>
    </Box>
  );
};

export default EmployeeProfile;
