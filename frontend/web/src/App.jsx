import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";

import UserLogin from "./pages/user/UserLogin";
import UserRegister from "./pages/user/UserRegister";
import UserHome from "./pages/user/UserHome";
import UserExplore from "./pages/user/UserExplore";
import PoiDetail from "./pages/user/PoiDetail";
import UserMap from "./pages/user/UserMap";
import UserChat from "./pages/user/UserChat";
import UserProfile from "./pages/user/UserProfile";
import AddPoi from "./pages/user/AddPoi";

import WebGeofenceEngine from "./components/user/WebGeofenceEngine";

import { getUserToken } from "./services/userService";
import { PoiProvider } from "./stores/PoiProvider";

function RequireUser({ children }) {
  const location = useLocation();

  if (!getUserToken()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <PoiProvider>

        {/* 
         * Geofence chạy toàn bộ USER APP.
         * Không đặt bên trong từng Route.
         */}
        <WebGeofenceEngine />

        <Routes>

          {/* ========================= */}
          {/* USER AUTH                  */}
          {/* ========================= */}

          <Route
            path="/login"
            element={<UserLogin />}
          />

          <Route
            path="/register"
            element={<UserRegister />}
          />

          {/* ========================= */}
          {/* ADMIN                      */}
          {/* ========================= */}

          <Route
            path="/admin/login"
            element={<AdminLogin />}
          />

          <Route
            path="/admin"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/users"
            element={<AdminUsers />}
          />

          {/* ========================= */}
          {/* HOME                       */}
          {/* ========================= */}

          <Route
            path="/"
            element={
              <RequireUser>
                <UserHome />
              </RequireUser>
            }
          />

          {/* ========================= */}
          {/* EXPLORE                    */}
          {/* ========================= */}

          <Route
            path="/explore"
            element={
              <RequireUser>
                <UserExplore />
              </RequireUser>
            }
          />

          {/* ========================= */}
          {/* POI DETAIL                 */}
          {/* ========================= */}

          <Route
            path="/pois/:id"
            element={
              <RequireUser>
                <PoiDetail />
              </RequireUser>
            }
          />

          {/* ========================= */}
          {/* MAP                        */}
          {/* ========================= */}

          <Route
            path="/map"
            element={
              <RequireUser>
                <UserMap />
              </RequireUser>
            }
          />

          {/* ========================= */}
          {/* CHAT                       */}
          {/* ========================= */}

          <Route
            path="/chat"
            element={
              <RequireUser>
                <UserChat />
              </RequireUser>
            }
          />

          {/* ========================= */}
          {/* PROFILE                    */}
          {/* ========================= */}

          <Route
            path="/profile"
            element={
              <RequireUser>
                <UserProfile />
              </RequireUser>
            }
          />

          {/* ========================= */}
          {/* ADD POI                    */}
          {/* ========================= */}

          <Route
            path="/add-poi"
            element={
              <RequireUser>
                <AddPoi />
              </RequireUser>
            }
          />

          {/* ========================= */}
          {/* FALLBACK                   */}
          {/* ========================= */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>
      </PoiProvider>
    </BrowserRouter>
  );
}

export default App;