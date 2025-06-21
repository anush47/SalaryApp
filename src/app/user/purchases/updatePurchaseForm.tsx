import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  // Alert, // Remove if only used for snackbar, or ensure it's not the general error one
  // Snackbar, // Removed
  Grid,
  Paper,
  Chip,
  CardHeader,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slide,
  TextField,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { ArrowBack, ArrowForward, HideImage } from "@mui/icons-material";
import Link from "next/link";
import { LoadingButton } from "@mui/lab";
import Image from "next/image";
import { useSnackbar } from "@/app/contexts/SnackbarContext"; // Import useSnackbar
import Alert from "@mui/material/Alert"; // Keep for specific inline alerts if any, or remove if not used

interface ChipData {
  key: number;
  label: string;
}

const SlideTransition = (props: any) => <Slide {...props} direction="up" />;

const formatPrice = (price: number) => {
  return price.toLocaleString("en-LK", {
    style: "currency",
    currency: "LKR",
  });
};

interface UpdatePurchaseFormProps {
  handleBackClick: () => void;
  purchaseId: string;
}

const UpdatePurchaseForm: React.FC<UpdatePurchaseFormProps> = ({
  handleBackClick,
  purchaseId,
}) => {
  const [periods, setPeriods] = useState<ChipData[]>([]);
  const [price, setPrice] = useState<number | null>(null);
  const [remark, setRemark] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [totalPrice, setTotalPrice] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  // const [error, setError] = useState<string | null>(null); // To be replaced by showSnackbar for general errors
  const { showSnackbar } = useSnackbar(); // Use the snackbar hook
  // const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false); // Removed
  // const [snackbarMessage, setSnackbarMessage] = useState<string>(""); // Removed
  // const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success"); // Removed
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | ArrayBuffer | null>(
    null
  );
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [employerNo, setEmployerNo] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchPurchase = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/purchases/?purchaseId=${purchaseId}`);
        const data = await res.json();
        console.log(data);
        setPrice(data.purchase.price);
        setPeriods(
          data.purchase.periods.map((period: string, index: number) => ({
            key: index,
            label: period,
          }))
        );
        setStatus(data.purchase.approvedStatus);
        setRemark(data.purchase.remark);
        setCompanyId(data.purchase.company);
        setCompanyName(data.purchase.companyName);
        setEmployerNo(data.purchase.companyEmployerNo);
        setTotalPrice(data.purchase.totalPrice);
        if (data.purchase.request) {
          const imageResponse = await fetch(data.purchase.request);
          const imageBlob = await imageResponse.blob();
          setImage(
            new File([imageBlob], "image.jpg", { type: imageBlob.type })
          );
        }
      } catch (err) {
        // setError("Failed to fetch purchase details"); // Removed
        showSnackbar({
          message: "Failed to fetch purchase details",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    if (!price) fetchPurchase();
  }, [purchaseId, companyId, showSnackbar, price]); // Added showSnackbar and price to dependencies

  useEffect(() => {
    if (image) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(image);
    } else {
      setImagePreview(null);
    }
  }, [image]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    // setError(null); // Removed

    const payload = {
      approvedStatus: status,
      _id: purchaseId,
      remark,
      request: image ? null : "delete",
      totalPrice: parseInt(totalPrice),
    };

    try {
      const response = await fetch(`/api/purchases/?purchaseId=${purchaseId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update purchase");
      }

      // setSnackbarMessage("Purchase updated successfully"); // Removed
      // setSnackbarSeverity("success"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({
        message: "Purchase updated successfully",
        severity: "success",
      });
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Shorter delay
      handleBackClick();
    } catch (error: any) {
      // setError(error.message); // Removed
      // setSnackbarMessage(error.message); // Removed
      // setSnackbarSeverity("error"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({
        message: error.message || "An error occurred",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const DeleteDialog = () => {
    return (
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Purchase</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this purchase?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <LoadingButton
            loading={loading}
            loadingPosition={"center"}
            onClick={handleDeleteEntry}
            color="error"
            disabled={loading}
          >
            <span>Delete</span>
          </LoadingButton>
        </DialogActions>
      </Dialog>
    );
  };

  const handleDeleteEntry = async () => {
    setLoading(true);
    //confirm using mui dialog

    // setError(null); // Removed

    try {
      const response = await fetch(`/api/purchases/?purchaseId=${purchaseId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to delete purchase");
      }

      // setSnackbarMessage("Purchase deleted successfully"); // Removed
      // setSnackbarSeverity("success"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({
        message: "Purchase deleted successfully",
        severity: "success",
      });
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Shorter delay
      handleBackClick();
    } catch (error: any) {
      // setError(error.message); // Removed
      // setSnackbarMessage(error.message); // Removed
      // setSnackbarSeverity("error"); // Removed
      // setSnackbarOpen(true); // Removed
      showSnackbar({
        message: error.message || "An error occurred",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // const handleSnackbarClose = ( // Removed
  //   event?: React.SyntheticEvent | Event,
  //   reason?: string
  // ) => {
  //   if (reason === "clickaway") {
  //     return;
  //   }
  //   setSnackbarOpen(false);
  // };

  const oneMonthPrice = price ?? 0;

  function handleImageDelete(event: React.MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    setImage(null);
  }

  return (
    <Box>
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
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title="Discard and go back to my purchaces" arrow>
                <IconButton onClick={handleBackClick}>
                  <ArrowBack />
                </IconButton>
              </Tooltip>
              <Typography variant="h4" component="h1">
                Purchase Details
              </Typography>
            </Box>
          </Box>
        }
      />
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ m: 1 }}>
              Months Purchased - {periods.length}
            </Typography>
            <Paper
              sx={{
                display: "flex",
                justifyContent: "left",
                flexWrap: "wrap",
                listStyle: "none",
                p: 0.5,
                m: 0,
              }}
              component="ul"
            >
              {periods.map((data) => (
                <li key={data.key}>
                  <Chip
                    label={data.label}
                    sx={{
                      m: 0.5,
                      backgroundColor: (theme) => theme.palette.primary.main,
                      color: (theme) => theme.palette.primary.contrastText,
                      fontSize: "1.2rem",
                      borderRadius: "16px",
                    }}
                  />
                </li>
              ))}
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <div>
                  <Typography variant="h6">Company Details</Typography>
                  <Typography variant="body1">
                    Company Name: {companyName}
                    <Link
                      className="mx-2"
                      href={`user/mycompanies/${companyId}?companyPageSelect=details`}
                    >
                      <IconButton color="primary">
                        <ArrowForward />
                      </IconButton>
                    </Link>
                  </Typography>
                  <Typography variant="body1">
                    Employer No: {employerNo}
                  </Typography>
                </div>
                <hr className="my-2" />
                <div>
                  <Typography variant="h6">Price Details</Typography>
                  <Typography variant="body1">
                    Price per Month: {formatPrice(oneMonthPrice)}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "primary.main",
                    }}
                  >
                    Total Price:{" "}
                    {oneMonthPrice * periods.length !== Number(totalPrice) ? (
                      <>
                        <span style={{ textDecoration: "line-through" }}>
                          {formatPrice(oneMonthPrice * periods.length)}
                        </span>
                        <span> {formatPrice(parseInt(totalPrice))}</span>
                      </>
                    ) : (
                      formatPrice(oneMonthPrice * periods.length)
                    )}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {periods.length} x {formatPrice(oneMonthPrice)}
                  </Typography>
                </div>
              </CardContent>
            </Card>
          </Grid>
          {image && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                {imagePreview && (
                  <Box
                    sx={{
                      width: "100%",
                      borderRadius: 1,
                      overflow: "hidden",
                      bgcolor: "background.default",
                    }}
                  >
                    {image?.type === "application/pdf" ? (
                      <embed
                        src={imagePreview as string}
                        type="application/pdf"
                        width="100%"
                        height="400px"
                      />
                    ) : (
                      <Image
                        src={imagePreview as string}
                        alt="Uploaded Preview"
                        width={400}
                        height={400}
                      />
                    )}
                  </Box>
                )}
              </FormControl>
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            {image && (
              <>
                <Tooltip title="Delete Media" arrow>
                  <span className="mb-2">
                    <Button
                      variant="outlined"
                      color={"error"}
                      onClick={handleImageDelete}
                      disabled={loading}
                      startIcon={
                        loading ? <CircularProgress size={24} /> : <HideImage />
                      }
                    >
                      {loading ? "Loading..." : "Delete Media"}
                    </Button>
                  </span>
                </Tooltip>
                <div className="mb-5" />
              </>
            )}
            <FormControl fullWidth>
              <TextField
                label="Remark"
                variant="outlined"
                name="remark"
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                multiline
                rows={2}
                sx={{
                  mb: 2,
                }}
              />
            </FormControl>
            <FormControl fullWidth>
              <TextField
                label="Total Price"
                variant="outlined"
                name="totalPrice"
                color="success"
                value={totalPrice}
                onChange={(event) => setTotalPrice(event.target.value)}
                type="number"
                sx={{
                  mb: 2,
                }}
              />
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                label="Status"
                name="status"
                onChange={(event) => setStatus(event.target.value as string)}
                value={status}
                displayEmpty
                fullWidth
                className="mb-2"
              >
                <MenuItem value="pending">
                  <Typography sx={{ color: "warning.main" }}>
                    Pending
                  </Typography>
                </MenuItem>
                <MenuItem value="approved">
                  <Typography sx={{ color: "success.main" }}>
                    Approved
                  </Typography>
                </MenuItem>
                <MenuItem value="rejected">
                  <Typography sx={{ color: "error.main" }}>Rejected</Typography>
                </MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Update purchase" arrow>
              <span>
                <Button
                  variant="contained"
                  color={
                    status === "approved"
                      ? "success"
                      : status === "rejected"
                      ? "error"
                      : "warning"
                  }
                  onClick={handleSubmit}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={24} /> : null}
                >
                  {loading
                    ? "Updating..."
                    : (
                        {
                          approved: "Approve",
                          pending: "Pending",
                          rejected: "Reject",
                        } as { [key: string]: string }
                      )[status as "approved" | "pending" | "rejected"]}
                </Button>
              </span>
            </Tooltip>
            <hr className="my-3" />
            <Tooltip title="Delete Entry" arrow>
              <span className="mb-2">
                <Button
                  variant="outlined"
                  color={"error"}
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={24} /> : null}
                >
                  {loading ? "Loading..." : "Delete Entry"}
                </Button>
              </span>
            </Tooltip>
          </Grid>
        </Grid>
      </Box>
      {/* Snackbar component removed, global one will be used */}
      <DeleteDialog />
    </Box>
  );
};

export default UpdatePurchaseForm;
