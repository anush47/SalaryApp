"use client";

import {
  Box,
  Typography,
  Alert,
  AlertTitle,
  Collapse,
  Paper,
  IconButton,
  InputAdornment,
  Button,
  CardHeader,
  Divider,
  TextField,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Login, Visibility, VisibilityOff, Google } from "@mui/icons-material";
import UserAgreementDialog from "./userAgreementDialog";
import Link from "next/link";

const SignInPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [openConsentDialog, setOpenConsentDialog] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") ?? "/";
  const error = searchParams?.get("error");

  const ErrorAlert = () => {
    const [isError, setIsError] = useState(error ? true : false);

    if (isError) {
      setTimeout(() => {
        setIsError(false);
      }, 5000);
    }

    return (
      <Collapse in={isError}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error === "CredentialsSignin"
            ? "Invalid email or password."
            : "An error occurred."}
        </Alert>
      </Collapse>
    );
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    setLoading(true);
    e.preventDefault();
    signIn("credentials", {
      redirect: true,
      email,
      password,
      callbackUrl,
    });
  };

  const handleLoginGoogle = async () => {
    setLoading(true);
    signIn("google", {
      redirect: true,
      callbackUrl,
    });
  };

  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  const handleOpenConsentDialog = () => {
    setOpenConsentDialog(true);
  };

  const handleCloseConsentDialog = () => {
    setOpenConsentDialog(false);
  };

  const theme = useTheme();

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
      padding={3}
      style={{
        background:
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
            : "linear-gradient(300deg, #F2FCFF 0%, #B3DBE6 100%)",
        color: theme.palette.text.primary,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          maxWidth: 450,
          width: "100%",
          px: 3,
          py: 4,
          borderRadius: 3,
          boxShadow: 4,
          backgroundColor: "background.paper",
        }}
      >
        <ErrorAlert />
        <div className="flex justify-center">
          <Link href="/">
            <Image
              src="/Logo_Withtext.png"
              alt="Logo"
              width={200}
              height={200}
              style={{
                padding: 0,
                margin: 0,
                marginRight: 20,
                marginBottom: 0,
                objectFit: "cover",
              }}
            />
          </Link>
        </div>
        <CardHeader
          subheader="Sign in to continue"
          titleTypographyProps={{
            variant: "h4",
            align: "center",
            color: "primary.main",
          }}
          subheaderTypographyProps={{ align: "center" }}
          sx={{ mb: 1 }}
        />
        <Box display="flex" flexDirection="column" gap={3}>
          <LoadingButton
            variant="contained"
            color="primary"
            onClick={handleLoginGoogle}
            startIcon={<Google />}
            loading={loading}
            sx={{ textTransform: "none", fontSize: "1rem", py: 1.5 }}
          >
            Continue with Google
          </LoadingButton>
          <Divider flexItem>
            <Typography variant="body2" color="text.secondary">
              OR
            </Typography>
          </Divider>
          {!showEmailLogin && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setShowEmailLogin(true)}
              sx={{ textTransform: "none", fontSize: "1rem", py: 1.2 }}
            >
              Continue with Email
            </Button>
          )}
          {showEmailLogin && (
            <Box
              component="form"
              noValidate
              autoComplete="off"
              display="flex"
              flexDirection="column"
              gap={2}
              onSubmit={handleLogin}
            >
              <Typography variant="body2" align="center" color="text.secondary">
                Use your credentials only if already registered with Google and
                changed your password.
              </Typography>
              <TextField
                label="Email"
                variant="outlined"
                autoComplete="email"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label="Password"
                variant="outlined"
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <LoadingButton
                variant="contained"
                color="primary"
                type="submit"
                loading={loading}
                endIcon={<Login />}
                sx={{ textTransform: "none", fontSize: "1rem", py: 1.5 }}
              >
                Login
              </LoadingButton>
            </Box>
          )}
          <Typography variant="body2" align="center" color="text.secondary">
            By signing in, you agree to our{" "}
            <Button color="primary" onClick={handleOpenConsentDialog}>
              User Agreement
            </Button>
            .
          </Typography>
        </Box>
      </Paper>
      <UserAgreementDialog
        openConsentDialog={openConsentDialog}
        handleCloseConsentDialog={handleCloseConsentDialog}
      />
    </Box>
  );
};

export default SignInPage;
