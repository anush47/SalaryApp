import React, { useState } from "react";
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridToolbar,
} from "@mui/x-data-grid";
import {
  CircularProgress,
  Box,
  Card,
  CardContent,
  Button,
  CardHeader,
  Typography,
  useTheme,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import Link from "next/link";
import { LoadingButton } from "@mui/lab";
import { Add, Delete } from "@mui/icons-material";
import CreateUserDialog from "./CreateUserDialog";
import { useSnackbar } from "@/app/context/SnackbarContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GC_TIME, STALE_TIME } from "@/app/lib/consts";

const fetchUsers = async () => {
  const response = await fetch("/api/users?needCompanies=true");
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  const data = await response.json();
  return data.users.map((user: any) => ({ ...user, id: user._id }));
};

const Users = ({
  user,
}: {
  user: { name: string; email: string; role: string; image: string };
}) => {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const {
    data: users,
    isLoading,
    isError,
    error,
  } = useQuery<any[], Error>({
    queryKey: ["users"],
    queryFn: fetchUsers,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`api/users?userId=${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      showSnackbar({
        message: "User deleted successfully",
        severity: "success",
      });
    },
    onError: (error: Error) => {
      showSnackbar({ message: error.message, severity: "error" });
    },
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");

  const onDeleteClick = async (id: string) => {
    const userToDelete = users?.find((user) => user.id === id);
    if (userToDelete) {
      if (userToDelete.role === "admin") {
        showSnackbar({
          message: `Cannot delete admin user ID: ${id}`,
          severity: "error",
        });
        return;
      }
      if (userToDelete.companies && userToDelete.companies.length > 0) {
        showSnackbar({
          message: `Cannot delete ${userToDelete.name} with companies assigned.`,
          severity: "error",
        });
        return;
      }
      await deleteUserMutation.mutateAsync(id);
    }
  };

  const handleDeleteDialogClose = async (confirmed: boolean) => {
    if (confirmed) {
      await onDeleteClick(userId);
    }
    setDeleteDialogOpen(false);
  };

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", flex: 1 },
    { field: "name", headerName: "Name", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
    { field: "role", headerName: "Role", flex: 1 },
    {
      field: "companies",
      headerName: "Companies",
      flex: 4,
      renderCell: (params) => {
        return (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              overflowX: "auto",
              whiteSpace: "nowrap",
              p: 1,
              maxWidth: "100%",
            }}
          >
            {params.value?.map((company: any) => (
              <Link
                href={`/user/mycompanies/${company._id}?companyPageSelect=details`}
                key={company._id}
                passHref
              >
                <Button color="primary" variant="outlined" size="small">
                  {company.name}
                </Button>
              </Link>
            ))}
          </Box>
        );
      },
    },
    {
      field: "delete",
      headerName: "Delete",
      flex: 1,
      renderCell: (params) => {
        if (params.row?.role !== "admin") {
          return (
            <div>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => {
                  setUserId(params.row.id);
                  setDeleteDialogOpen(true);
                }}
                disabled={deleteUserMutation.isPending}
              >
                Delete
              </Button>
            </div>
          );
        }
        return null;
      },
    },
  ];

  const [columnVisibilityModel, setColumnVisibilityModel] =
    useState<GridColumnVisibilityModel>({
      id: false,
      email: false,
      delete: false,
    });

  if (isLoading) {
    return (
      <Box className="flex flex-col items-center justify-center min-h-screen">
        <CircularProgress color="primary" size={60} />
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
            >
              <Typography variant="h5" color={theme.palette.text.primary}>
                Users
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setCreateDialogOpen(true)}
                startIcon={<Add />}
              >
                New
              </Button>
            </Box>
          }
        />
        <CardContent>
          <Box sx={{ height: 450, width: "100%" }}>
            <DataGrid
              rows={users || []}
              columns={columns}
              editMode="row"
              sx={{
                height: "calc(100vh - 230px)",
              }}
              initialState={{
                pagination: { paginationModel: { pageSize: 20 } },
                filter: {
                  filterModel: {
                    items: [],
                    quickFilterExcludeHiddenColumns: false,
                  },
                },
              }}
              pageSizeOptions={[5, 10, 20, 50]}
              slots={{ toolbar: GridToolbar }}
              slotProps={{ toolbar: { showQuickFilter: true } }}
              disableRowSelectionOnClick
              disableDensitySelector
              columnVisibilityModel={columnVisibilityModel}
              onColumnVisibilityModelChange={(newModel) =>
                setColumnVisibilityModel(newModel)
              }
            />
          </Box>
        </CardContent>
      </Card>
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this user?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <LoadingButton
            onClick={() => handleDeleteDialogClose(true)}
            color="error"
            loading={deleteUserMutation.isPending}
            startIcon={<Delete />}
          >
            Delete
          </LoadingButton>
        </DialogActions>
      </Dialog>
      <CreateUserDialog open={createDialogOpen} setOpen={setCreateDialogOpen} />
    </Box>
  );
};

export default Users;
