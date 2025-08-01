import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Grid,
  Paper,
  Chip,
  CardHeader,
  IconButton,
  Tooltip,
  Card,
} from "@mui/material";
import { ArrowBack, ShoppingBag, ShoppingCart } from "@mui/icons-material";
import dayjs from "dayjs";
import { useSearchParams } from "next/navigation";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useSnackbar } from "@/app/contexts/SnackbarContext";
import { useQueryClient } from "@tanstack/react-query";
interface ChipData {
  key: number;
  label: string;
}
const validatePeriod = (value: string) => {
  const regex = /^(0?[1-9]|1[0-2])-(19|20)\d\d$/;
  return regex.test(value);
};
const isValidMonthYear = (value: string) => {
  if (!validatePeriod(value)) return false;
  const [monthStr, yearStr] = value.split("-");
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);
  return year >= 1990 && year <= 2026 && month >= 1 && month <= 12;
};
const formatPeriod = (value: string) => {
  const [monthStr, yearStr] = value.split("-");
  const month = monthStr.padStart(2, "0");
  const year = yearStr.padStart(4, "0");
  return `${month}-${year}`;
};
const formatPrice = (price: number) => {
  return price.toLocaleString("en-LK", { style: "currency", currency: "LKR" });
};
const NewPurchaseForm: React.FC<{
  handleBackClick: () => void;
  companyId: String;
}> = ({ handleBackClick, companyId }) => {
  const [periods, setPeriods] = useState<ChipData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { showSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | ArrayBuffer | null>(
    null
  );
  const [purchasedPeriods, setPurchasedPeriods] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState<number | null>(null);
  const [finalTotalPrice, setFinalTotalPrice] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const periodsInitial = searchParams ? searchParams.get("periods") : null;
  useEffect(() => {
    if (periodsInitial) {
      const periods = periodsInitial.split(" ");
      const validPeriods = periods.filter((period) => isValidMonthYear(period));
      setPeriods(
        validPeriods.map((period, index) => ({
          key: index,
          label: formatPeriod(period),
        }))
      );
    }
  }, [periodsInitial]);
  useEffect(() => {
    const currentMonth = dayjs().format("MM");
    const currentYear = dayjs().format("YYYY");
    setSelectedPeriod(`${currentMonth}-${currentYear}`);
    const fetchCompany = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/companies?companyId=${companyId}`);
        const data = await res.json();
        setPrice(data.companies[0].monthlyPrice);
      } catch (err) {
        showSnackbar({
          message: "Failed to fetch company details",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    const fetchPurchases = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/purchases/?companyId=${companyId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch purchases");
        }
        const data = await response.json();
        const purchases = data.purchases
          .filter((purchase: any) => purchase.approvedStatus !== "rejected")
          .map((purchase: any) => purchase.periods)
          .flat();
        setPurchasedPeriods(purchases);
      } catch (error) {
        showSnackbar({
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
    fetchPurchases();
  }, [companyId, showSnackbar]);
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
  const handleAddPeriod = () => {
    if (
      selectedPeriod &&
      isValidMonthYear(selectedPeriod) &&
      !periods.find((p) => p.label === formatPeriod(selectedPeriod))
    ) {
      if (purchasedPeriods.includes(formatPeriod(selectedPeriod))) {
        showSnackbar({
          message: "Period already purchased " + formatPeriod(selectedPeriod),
          severity: "error",
        });
        return;
      }
      const formattedPeriod = formatPeriod(selectedPeriod);
      setPeriods([...periods, { key: periods.length, label: formattedPeriod }]);
      const [month, year] = selectedPeriod.split("-");
      const date = dayjs(`${year}-${month}-01`);
      const nextMonth = date.add(1, "month");
      setSelectedPeriod(nextMonth.format("MM-YYYY"));
    }
  };
  const handleDeletePeriod = (chipToDelete: ChipData) => () => {
    setPeriods((chips) =>
      chips.filter((chip) => chip.key !== chipToDelete.key)
    );
  };
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setImage(event.target.files[0]);
    }
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const payload = {
      periods: periods.map((p) => p.label),
      price: price ?? 0,
      company: companyId,
      request: image ? await convertImageToBase64(image) : null,
    };
    try {
      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to create purchase");
      }
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      showSnackbar({
        message: "Purchase Requested successfully",
        severity: "success",
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      handleBackClick();
    } catch (error: any) {
      showSnackbar({
        message: error.message || "An error occurred",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  useEffect(() => {
    async function fetchPrice() {
      setLoading(true);
      try {
        if (!companyId || periods.length === 0) return;
        const monthsParam = periods.map((p) => p.label).join("+");
        const res = await fetch(
          `/api/purchases/price?companyId=${companyId}&months=${monthsParam}`
        );
        if (!res.ok) {
          throw new Error("Failed to fetch price details");
        }
        const data = await res.json();
        setFinalTotalPrice(data.finalTotalPrice);
        setTotalPrice(data.totalPrice);
      } catch (err) {
        showSnackbar({
          message: "Failed to fetch price details",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    }
    if (periods && companyId) fetchPrice();
  }, [companyId, periods, showSnackbar]);
  const oneMonthPrice = price ?? 3000;
  const handleDateChange = (newDate: any) => {
    if (newDate) {
      setSelectedPeriod(newDate.format("MM-YYYY"));
    }
  };
  const periodChip = (data: ChipData) => {
    return (
      <AnimatePresence>
        <motion.div
          key={data.key}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Chip
            label={data.label}
            onDelete={handleDeletePeriod(data)}
            color="primary"
            variant="outlined"
            sx={{
              py: 1,
              px: 1.5,
              fontSize: "0.875rem",
              fontWeight: 500,
              borderRadius: 3,
              boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
              bgcolor: "background.paper",
              color: "primary.main",
              borderColor: "primary.main",
              transition: "all 0.3s ease-in-out",
              "&:hover": {
                bgcolor: "primary.light",
                color: "primary.contrastText",
                borderColor: "primary.light",
                boxShadow: "0 6px 12px rgba(0,0,0,0.25)",
              },
              "& .MuiChip-deleteIcon": {
                color: "error.main",
                transition: "color 0.3s ease",
                "&:hover": { color: "error.dark" },
              },
            }}
          />
        </motion.div>
      </AnimatePresence>
    );
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ maxWidth: 1200, margin: "0 auto" }}
    >
      <Card elevation={0} sx={{ mb: 3, bgcolor: "transparent" }}>
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
                <Tooltip title="Discard and go back" arrow>
                  <IconButton onClick={handleBackClick}>
                    <ArrowBack />
                  </IconButton>
                </Tooltip>
                <Typography variant="h4" component="h1">
                  New Purchase
                </Typography>
              </Box>
            </Box>
          }
        />
      </Card>
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Card
                sx={{
                  p: 3,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "grey.900" : "grey.50",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              >
                <Typography variant="h5" sx={{ mb: 2 }}>
                  Months to Purchase - {periods.length}
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <Paper
                    sx={{
                      p: 2,
                      backgroundColor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "grey.800"
                          : "common.white",
                      minHeight: "100px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      alignItems: "flex-start",
                    }}
                  >
                    {periods.map((data) => periodChip(data))}
                  </Paper>
                </Box>
                <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Select Month"
                      value={dayjs(selectedPeriod, "MM-YYYY")}
                      onChange={handleDateChange}
                      views={["month", "year"]}
                      format="MM-YYYY"
                      sx={{ minWidth: 80 }}
                      minDate={dayjs("1990-01-01")}
                      maxDate={dayjs("2026-12-31")}
                    />
                  </LocalizationProvider>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleAddPeriod}
                    startIcon={<ShoppingCart />}
                    sx={{ height: 56, textWrap: "nowrap" }}
                  >
                    Add To Purchases
                  </Button>
                </Box>
              </Card>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Card
                sx={{
                  p: 3,
                  height: "100%",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "grey.900" : "grey.50",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              >
                <Typography variant="h5" sx={{ mb: 3, fontWeight: "medium" }}>
                  Price
                </Typography>
                <Box
                  sx={{
                    bgcolor: loading ? "background.default" : "primary.900",
                    my: 2,
                    borderRadius: 2,
                    color: "common.white",
                  }}
                >
                  {loading ? (
                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      <Typography
                        variant="subtitle1"
                        color="text.secondary"
                        sx={{ mb: 2 }}
                      >
                        Monthly Fee: {formatPrice(oneMonthPrice)}
                      </Typography>
                      <Typography
                        variant="h5"
                        color="primary"
                        fontWeight="bold"
                      >
                        Total: {formatPrice(finalTotalPrice ?? 0)}
                      </Typography>
                      {finalTotalPrice !== totalPrice && (
                        <Typography
                          variant="body2"
                          sx={{
                            textDecoration: "line-through",
                            color: "text.secondary",
                          }}
                        >
                          Original: {formatPrice(totalPrice ?? 0)}
                        </Typography>
                      )}
                    </>
                  )}
                </Box>
              </Card>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Card
                sx={{
                  p: 3,
                  height: "100%",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "grey.900" : "grey.50",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              >
                <Typography variant="h5" sx={{ mb: 3, fontWeight: "medium" }}>
                  Payment Details
                </Typography>
                <Box
                  sx={{
                    bgcolor: "background.default",
                    p: 2,
                    borderRadius: 1,
                    mb: 3,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    sx={{ mb: 2 }}
                  >
                    Bank Information
                  </Typography>
                  <Typography variant="body1">
                    Account Number: 123456789
                  </Typography>
                  <Typography variant="body1">Bank: Example Bank</Typography>
                </Box>
              </Card>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <Card
                sx={{
                  p: 3,
                  height: "100%",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "grey.900" : "grey.50",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              >
                <Typography variant="h5" sx={{ mb: 3, fontWeight: "medium" }}>
                  Payment
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    alignItems: "flex-start",
                  }}
                >
                  <Button
                    variant="outlined"
                    component="label"
                    disabled={(totalPrice ?? 0) <= 0}
                    startIcon={<ShoppingBag />}
                    sx={{ mb: 2 }}
                  >
                    Upload Payment Slip
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      hidden
                      onChange={handleImageChange}
                    />
                  </Button>
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
                          alt="Payment Slip"
                          width={400}
                          height={400}
                        />
                      )}
                    </Box>
                  )}
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    onClick={handleSubmit}
                    disabled={loading || (totalPrice ?? 0) <= 0}
                    startIcon={
                      loading ? <CircularProgress size={20} /> : <ShoppingBag />
                    }
                    sx={{ mt: "auto", fontWeight: "bold", py: 1.5 }}
                  >
                    {loading ? "Processing..." : "Confirm Purchase"}
                  </Button>
                </Box>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};
export default NewPurchaseForm;
