import { createBrowserRouter, Navigate } from "react-router";
import Layout from "./components/layout/Layout";
import SignInPage from "./pages/SignInPage";
import DashboardPage from "./pages/DashboardPage";
import SessionPage from "./pages/SessionPage";
import SummaryPage from "./pages/SummaryPage";
import ProfilePage from "./pages/ProfilePage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SignInPage,
  },
  {
    // Pathless layout route - wraps all authenticated pages
    Component: Layout,
    children: [
      { path: "/dashboard", Component: DashboardPage },
      { path: "/session", Component: SessionPage },
      { path: "/summary", Component: SummaryPage },
      { path: "/profile", Component: ProfilePage },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
