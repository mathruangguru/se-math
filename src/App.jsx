import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import RequireAuth from "./components/auth/RequireAuth";
import RequireAdmin from "./components/admin/RequireAdmin";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TaskPage from "./pages/TaskPage";
import HyperlistPage from "./pages/HyperlistPage";
import LinkPage from "./pages/LinkPage";
import HyperlistAdminPage from "./pages/admin/HyperlistAdminPage";
import LinkAdminPage from "./pages/admin/LinkAdminPage";
import UsersAdminPage from "./pages/admin/UsersAdminPage";

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/task" element={<TaskPage />} />
          <Route path="/hyperlist" element={<HyperlistPage />} />
          <Route path="/link" element={<LinkPage />} />

          <Route element={<RequireAdmin />}>
            <Route path="/admin/hyperlist" element={<HyperlistAdminPage />} />
            <Route path="/admin/link" element={<LinkAdminPage />} />
            <Route path="/admin/users" element={<UsersAdminPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;
