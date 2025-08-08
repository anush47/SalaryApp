"use client";
import * as React from "react";
import "@fontsource/roboto/400.css";
import {
  AppBar,
  Avatar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  Breadcrumbs,
  useTheme,
} from "@mui/material";
import {
  Business,
  Menu as MenuIcon,
  Groups,
  Payments,
  ArrowBack,
  Home,
  NavigateNext,
  Money,
  LocalAtm,
  Payment,
  ShoppingBag,
  Summarize,
} from "@mui/icons-material";
import Link from "next/link";
import Image from "next/image";
import { Link as LinkM } from "@mui/material";
import { Company } from "../../clientComponents/companiesDataGrid";
import { ThemeSwitch } from "@/app/theme-provider";
import { Selected } from "./NavContainer";
import { useSnackbar } from "@/app/contexts/SnackbarContext";

const drawerWidth = 300;

interface Props {
  user: { name: string; email: string; role: string; image: string };
  selected: Selected;
  setSelected: (selected: Selected) => void;
  companyId: string;
}

const CompanySideBar: React.FC<Props> = ({
  user,
  selected,
  setSelected,
  companyId,
}) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [company, setCompany] = React.useState<Company | null>(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();

  const handleDrawerToggle = () => {
    setMobileOpen((prevState) => !prevState);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const menus = [
    {
      name: "Quick Tools",
      key: "quick",
      icon: <Home />,
    },
    {
      name: "Company Details",
      key: "details",
      icon: <Business />,
    },
    {
      name: "Employees",
      key: "employees",
      icon: <Groups />,
    },
    {
      name: "Salaries",
      key: "salaries",
      icon: <LocalAtm />,
    },
    {
      name: "EPF/ETF Payments",
      key: "payments",
      icon: <Payments />,
    },
    {
      name: "Documents",
      key: "documents",
      icon: <Summarize />,
    },
    {
      name: "Purchases",
      key: "purchases",
      icon: <ShoppingBag />,
    },
  ];

  const [breadcrumbs, setBreadcrumbs] = React.useState<React.ReactNode[]>([]);

  React.useEffect(() => {
    setBreadcrumbs([
      <LinkM underline="hover" key="1" color="text.main" href="/">
        Home
      </LinkM>,
      <LinkM
        underline="hover"
        key="2"
        color="text.main"
        href="
      /user?userPageSelect=mycompanies
    "
      >
        Companies
      </LinkM>,
      <LinkM underline="none" key="3" color="text.main">
        {company ? (
          <Typography
            noWrap
            sx={{ maxWidth: 350, overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {company.name}
          </Typography>
        ) : (
          "Loading..."
        )}
      </LinkM>,
      <LinkM underline="none" key="4" color="text.main">
        {(() => {
          switch (selected) {
            case "quick":
              return "Quick Tools";
            case "details":
              return "Company Details";
            case "employees":
              return "Employees";
            case "salaries":
              return "Salaries";
            case "payments":
              return "Payments";
            case "purchases":
              return "Purchases";
            case "documents":
              return "Documents";
            default:
              return "";
          }
        })()}
      </LinkM>,
    ]);
  }, [selected, company]);

  React.useEffect(() => {
    //fetch company
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/companies?companyId=${companyId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch company");
        }
        const data = await response.json();
        setCompany(data.companies[0]);
      } catch (error) {
        showSnackbar({
          message: "Error fetching company.",
          severity: "error",
        });
      }
    };

    if (companyId) fetchCompany();
  }, [companyId]);

  const drawer = (
    <div>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          padding: 3,
        }}
      >
        <Typography
          color="primary"
          variant="h6"
          noWrap
          component="div"
          sx={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {company?.name}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {user.name === "" ? "No email" : user.name}
        </Typography>
      </Box>
      <Divider />
      <List>
        {menus.map((menu) => (
          <ListItem key={menu.name} disablePadding>
            <ListItemButton
              selected={selected === menu.key}
              onClick={() => {
                mobileOpen && handleDrawerToggle();
                if (selected !== menu.key) {
                  setSelected(menu.key as Selected);
                }
              }}
              component={Link}
              href={`/user/mycompanies/${companyId}?companyPageSelect=${menu.key}`}
              sx={{
                "&.Mui-selected": {
                  backgroundColor: theme.palette.action.selected,
                  "& .MuiListItemIcon-root": {
                    color: theme.palette.primary.main,
                  },
                },
              }}
            >
              <ListItemIcon>{menu.icon}</ListItemIcon>
              <ListItemText primary={menu.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem key="back" disablePadding>
          <ListItemButton
            component={Link}
            href="/user?userPageSelect=mycompanies"
            sx={{
              "&.Mui-selected": {
                backgroundColor: "#e0f7fa",
                "& .MuiListItemIcon-root": {
                  color: "#00796b",
                },
              },
            }}
          >
            <ListItemIcon>
              <ArrowBack />
            </ListItemIcon>
            <ListItemText primary="Back" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          //backgroundColor: theme.palette.background.default,
          //color: theme.palette.primary.main,
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <div
            className="flex-grow"
            style={{ display: "flex", alignItems: "center" }}
          >
            <Link href={"/"}>
              <Typography
                variant="h5"
                sx={{ flexGrow: 1 }}
                noWrap
                component="div"
              >
                Salary App
              </Typography>
            </Link>
            <Image
              src="/Logo.png"
              alt="Logo"
              width={30}
              height={30}
              style={{
                padding: 0,
                margin: 0,
                marginLeft: 2,
                objectFit: "fill",
              }}
            />
          </div>
          <Breadcrumbs
            separator={<NavigateNext fontSize="small" />}
            aria-label="breadcrumb"
            sx={
              //hide in small
              {
                display: { xs: "none", md: "block" },
              }
            }
          >
            {breadcrumbs}
          </Breadcrumbs>
          <div className="mx-4">
            <ThemeSwitch />
          </div>
          <IconButton onClick={handleMenuClick} color="inherit">
            <Avatar alt={user.name} src={user.image} />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            slotProps={{
              paper: {
                sx: {
                  width: 200,
                },
              },
            }}
          >
            <MenuItem
              component={Link}
              href="/user?userPageSelect=settings"
              onClick={handleMenuClose}
            >
              Settings
            </MenuItem>
            <Divider />
            <MenuItem component={Link} href="/api/auth/signout">
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
    </Box>
  );
};

export default CompanySideBar;
