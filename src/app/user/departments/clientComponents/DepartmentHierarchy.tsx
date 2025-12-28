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
  IconButton,
  Divider,
  useTheme,
  Tooltip,
  Container,
} from "@mui/material";
import { fetchCompanies, fetchDepartmentHierarchy } from "@/app/lib/api";

interface HierarchyProps {
  user: {
    name: string;
    email: string;
    id: string;
    role: string;
  };
  companyId?: string;
}

const DepartmentHierarchy: React.FC<HierarchyProps> = ({ user, companyId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  // Initialize with passed companyId or empty
  const [selectedCompany, setSelectedCompany] = useState<string>(companyId || "");
  const [hierarchy, setHierarchy] = useState<any[]>([]);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  useEffect(() => {
    // If companyId is provided via props, we don't need to fetch the list of companies
    // unless you want to validate it. For now, we skip fetching companies list if ID is locked.
    if (companyId) {
      setSelectedCompany(companyId);
      return;
    }

    const loadCompanies = async () => {
      try {
        const companiesData = await fetchCompanies();
        setCompanies(companiesData || []);
        if (companiesData && companiesData.length > 0) {
          setSelectedCompany(companiesData[0]._id);
        }
      } catch (err: any) {
        console.error("Error fetching companies:", err);
        setError(err.message || "Failed to load companies");
      }
    };

    loadCompanies();
  }, [companyId]);

  useEffect(() => {
    if (!selectedCompany) return;

    const loadHierarchy = async () => {
      try {
        setLoading(true);
        setError(null);

        const hierarchyData = await fetchDepartmentHierarchy(selectedCompany);
        setHierarchy(hierarchyData || []);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || "Failed to load department hierarchy");
        setLoading(false);
      }
    };

    loadHierarchy();
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



  // --- Desktop / Org Chart Tree View ---
  const renderOrgChartNode = (department: any) => {
    const hasChildren = department.children && department.children.length > 0;
    const hasEmployees = department.employees && department.employees.length > 0;

    return (
      <li key={department._id}>
        <Box
          sx={{
            display: 'inline-block',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 1.5,
            bgcolor: 'background.paper',
            minWidth: 180,
            textAlign: 'center',
            boxShadow: 1,
            position: 'relative',
            zIndex: 2
          }}
        >
          <Avatar
            sx={{
              bgcolor: "primary.main",
              width: 40,
              height: 40,
              fontSize: "1rem",
              mx: 'auto',
              mb: 1
            }}
          >
            {department.name.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="subtitle1" fontWeight="bold">
            {department.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Manager: {department.manager?.name || "None"}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {department.totalEmployeeCount || 0} Members
          </Typography>

          {/* Employee Preview (Vertical Chips) */}
          {hasEmployees && (
            <Box display="flex" flexDirection="column" alignItems="center" mt={1} gap={0.5}>
              {department.employees.slice(0, 5).map((emp: any) => (
                <Tooltip key={emp._id} title={`${emp.name} (${emp.designation})`}>
                  <Chip
                    avatar={<Avatar src={emp.image}>{emp.name.charAt(0)}</Avatar>}
                    label={emp.name.split(' ')[0]} // Show first name only to save space
                    size="small"
                    variant="outlined"
                    sx={{ width: '100%', maxWidth: 140, justifyContent: 'flex-start' }}
                  />
                </Tooltip>
              ))}
              {department.employees.length > 5 && (
                <Chip
                  label={`+${department.employees.length - 5} more`}
                  size="small"
                  variant="outlined"
                  sx={{ width: '100%', maxWidth: 140, bgcolor: 'action.hover' }}
                />
              )}
            </Box>
          )}
        </Box>

        {hasChildren && (
          <ul>
            {department.children.map((child: any) => renderOrgChartNode(child))}
          </ul>
        )}
      </li>
    );
  };


  if (!companyId && companies.length === 0 && !loading) {
    return (
      <Box p={3}>
        <Alert severity="info">
          No companies found. Create a company to view department hierarchy.
        </Alert>
      </Box>
    );
  }

  return (

    <Container maxWidth="xl" sx={{ overflowX: 'hidden' }}>
      <Box
        mb={3}
        p={1}
        display="flex"
        justifyContent="flex-end"
        alignItems="center"
      >
        {companies.length > 0 && (
          <FormControl sx={{ minWidth: { xs: '100%', sm: 300 } }}>
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
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress size={60} />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : hierarchy.length === 0 ? (
        <Alert severity="info">No departments found for this company.</Alert>
      ) : (
        <Box
          sx={{
            overflowX: 'auto',
            textAlign: 'center',
            py: 4,
            // Ensure container grows with content to prevent left-side clipping
            display: 'flex',
            justifyContent: 'left', // Center if it fits
            '& > ul': {
              // Force the root ul to take up space so scrolling works for left-overflow
              minWidth: 'min-content',
              mx: 'auto'
            },
            '& ul': {
              pt: 2,
              position: 'relative',
              transition: 'all 0.5s',
              display: 'flex',
              justifyContent: 'center'
            },
            '& li': {
              float: 'left',
              textAlign: 'center',
              listStyleType: 'none',
              position: 'relative',
              p: '20px 5px 0 5px',
              transition: 'all 0.5s'
            },
            // Connectors
            '& li::before, & li::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: '50%',
              borderTop: '1px solid #ccc',
              width: '50%',
              height: 20
            },
            '& li::after': {
              right: 'auto',
              left: '50%',
              borderLeft: '1px solid #ccc'
            },
            '& li:only-child::after, & li:only-child::before': {
              display: 'none'
            },
            '& li:only-child': {
              pt: 0
            },
            '& li:first-of-type::before, & li:last-of-type::after': {
              border: '0 none'
            },
            '& li:last-of-type::before': {
              borderRight: '1px solid #ccc',
              borderRadius: '0 5px 0 0'
            },
            '& li:first-of-type::after': {
              borderRadius: '5px 0 0 0'
            },
            '& ul ul::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '50%',
              borderLeft: '1px solid #ccc',
              width: 0,
              height: 20
            }
          }}
        >
          <ul style={{ padding: 0 }}>
            {hierarchy.map((dept) => renderOrgChartNode(dept))}
          </ul>
        </Box>
      )}
    </Container>
  );
};

export default DepartmentHierarchy;
