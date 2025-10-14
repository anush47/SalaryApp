"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Collapse,
  IconButton,
  Divider,
} from "@mui/material";
import {
  ExpandMore,
  ExpandLess,
  AccountTree,
  Person,
  Groups,
  Business,
} from "@mui/icons-material";

interface HierarchyProps {
  user: {
    name: string;
    email: string;
    id: string;
    role: string;
  };
}

const OrganizationHierarchy: React.FC<HierarchyProps> = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await fetch("/api/companies");
        if (!response.ok) throw new Error("Failed to fetch companies");
        const data = await response.json();
        setCompanies(data.companies || []);
        if (data.companies && data.companies.length > 0) {
          setSelectedCompany(data.companies[0]._id);
        }
      } catch (err: any) {
        console.error("Error fetching companies:", err);
        setError(err.message || "Failed to load companies");
      }
    };

    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;

    const fetchHierarchy = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/departments/hierarchy?companyId=${selectedCompany}`
        );
        if (!response.ok) throw new Error("Failed to fetch hierarchy");

        const data = await response.json();
        setHierarchy(data.hierarchy || []);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || "Failed to load organization hierarchy");
        setLoading(false);
      }
    };

    fetchHierarchy();
  }, [selectedCompany]);

  const toggleDepartment = (deptId: string) => {
    setExpandedDepts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };

  const renderEmployee = (employee: any) => (
    <Paper
      key={employee._id}
      sx={{
        p: 1,
        mb: 0.5,
        bgcolor: "background.default",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        transition: "all 0.2s",
        "&:hover": {
          bgcolor: "action.hover",
          boxShadow: 1,
        },
      }}
    >
      <Avatar
        sx={{
          bgcolor: "secondary.light",
          width: 32,
          height: 32,
          fontSize: "0.8rem",
        }}
      >
        {employee.name.charAt(0).toUpperCase()}
      </Avatar>
      <Box flex={1}>
        <Typography variant="body2" fontWeight="500">
          {employee.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {employee.designation || "Employee"} • #{employee.memberNo}
        </Typography>
      </Box>
      {employee.manager && (
        <Chip
          label="Has Manager"
          size="small"
          variant="outlined"
          color="info"
        />
      )}
    </Paper>
  );

  const renderDepartment = (department: any, level: number = 0) => {
    const isExpanded = expandedDepts.has(department._id.toString());
    const hasChildren = department.children && department.children.length > 0;
    const hasEmployees =
      department.employees && department.employees.length > 0;

    return (
      <Box key={department._id} sx={{ mb: 0.5 }}>
        <Paper
          elevation={0}
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              p: 1.5,
              cursor: hasChildren || hasEmployees ? "pointer" : "default",
              bgcolor: isExpanded ? "action.selected" : "background.paper",
              transition: "background-color 0.2s",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
            onClick={() =>
              (hasChildren || hasEmployees) &&
              toggleDepartment(department._id.toString())
            }
          >
            <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
              <Avatar
                sx={{
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  width: 32,
                  height: 32,
                  fontSize: "0.8rem",
                  mr: 1.5,
                }}
              >
                {department.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight="500">
                  {department.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {department.totalEmployeeCount || 0} employees
                  {department.manager &&
                    ` • Manager: ${department.manager.name}`}
                </Typography>
              </Box>
            </Box>

            {(hasChildren || hasEmployees) && (
              <IconButton size="small" sx={{ color: "text.secondary" }}>
                {isExpanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            )}
          </Box>

          <Collapse in={isExpanded} timeout="auto">
            <Box sx={{ pl: 3, pr: 2, pb: 2 }}>
              {/* Direct employees */}
              {hasEmployees && (
                <Box mb={2}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                    sx={{ pl: 1 }}
                  >
                    Team Members ({department.employees.length})
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    {department.employees.map(renderEmployee)}
                  </Box>
                </Box>
              )}

              {/* Child departments */}
              {hasChildren && (
                <Box sx={{ pl: 1 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Sub-Departments ({department.children.length})
                  </Typography>
                  {department.children.map((child: any) =>
                    renderDepartment(child, level + 1)
                  )}
                </Box>
              )}
            </Box>
          </Collapse>
        </Paper>
      </Box>
    );
  };

  if (companies.length === 0 && !loading) {
    return (
      <Box p={3}>
        <Alert severity="info">
          No companies found. Create a company to view organization hierarchy.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        mb={3}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <Typography variant="h6">Organization Hierarchy</Typography>
        {companies.length > 0 && (
          <FormControl sx={{ minWidth: 250 }}>
            <InputLabel>Select Company</InputLabel>
            <Select
              value={selectedCompany}
              label="Select Company"
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              {companies.map((company) => (
                <MenuItem key={company._id} value={company._id}>
                  {company.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
          <CircularProgress size={60} />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : hierarchy.length === 0 ? (
        <Card>
          <CardContent>
            <Alert severity="info">
              No departments found for this company. Create departments in the
              organization section to view the hierarchy.
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <Box>{hierarchy.map((dept) => renderDepartment(dept, 0))}</Box>
      )}
    </Box>
  );
};

export default OrganizationHierarchy;
