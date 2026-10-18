
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import { useEffect, useState } from "react";

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
import UserScanQR from "./pages/user/UserScanQR";
import UserPayment from "./pages/user/UserPayment";

import WebGeofenceEngine from "./components/user/WebGeofenceEngine";

import {
  getTourAuthorization,
  getMySessionAuthorizations,
  getUserToken,
  saveTourAuthorization,
} from "./services/userService";

import { PoiProvider } from "./stores/PoiProvider";

/* =====================================================
   REQUIRE USER
===================================================== */

function RequireUser({ children }) {
  const location = useLocation();

  const token = getUserToken();

  if (!token) {
    /*
     * Giữ cả pathname + query string.
     *
     * Ví dụ:
     * /scan-qr?qrToken=ABC123
     *
     * Sau khi login xong UserLogin sẽ quay lại
     * đúng URL này.
     */
    const from = `${location.pathname}${location.search}`;

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from,
        }}
      />
    );
  }

  return children;
}

/* =====================================================
   REQUIRE TOUR
===================================================== */


function RequireTour({ children }) {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAuthorization() {
      const token = getUserToken();

      if (!token) {
        if (!cancelled) {
          setAuthorized(false);
          setChecking(false);
        }
        return;
      }


      try {
        const data = await getMySessionAuthorizations();

        console.log("MY AUTHORIZATIONS RESPONSE:", data);

        const authorizations = Array.isArray(data?.authorizations)
          ? data.authorizations
          : [];

        const activeAuthorization = authorizations.find(
          (item) =>
            item.status === "active" &&
            Number(item.sessionId) > 0 &&
            item.session?.status === "active"
        );

        console.log("ACTIVE AUTHORIZATION:", activeAuthorization);

        if (cancelled) return;

        if (activeAuthorization) {
          const user = JSON.parse(
            localStorage.getItem("user_user") || "null"
          );

          saveTourAuthorization(
            {
              ...activeAuthorization,
              userId: Number(user?.id),
              status: "active",
              sessionId: Number(activeAuthorization.sessionId),
            },
            activeAuthorization.session
          );

          setAuthorized(true);
        } else {
          setAuthorized(false);
        }
      } catch (error) {
        console.error("MY AUTHORIZATIONS ERROR:", error);

        if (!cancelled) {
          setAuthorized(false);
        }
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }

    }

    setChecking(true);
    void checkAuthorization();

    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Đang kiểm tra quyền truy cập tour...
      </div>
    );
  }

  if (!authorized) {
    return (
      <Navigate
        to="/scan-qr"
        replace
        state={{
          from: `${location.pathname}${location.search}`,
        }}
      />
    );
  }

  return children;
}

/* =====================================================
   APP
===================================================== */

function App() {
  return (
    <BrowserRouter>
      <PoiProvider>
        <WebGeofenceEngine />

        <Routes>
          {/* =================================================
             USER AUTH
          ================================================= */}

          <Route
            path="/login"
            element={<UserLogin />}
          />

          <Route
            path="/register"
            element={<UserRegister />}
          />

          {/* =================================================
             TOUR ACCESS
          ================================================= */}

          <Route
            path="/scan-qr"
            element={
              <RequireUser>
                <UserScanQR />
              </RequireUser>
            }
          />

          <Route
            path="/payment"
            element={
              <RequireUser>
                <UserPayment />
              </RequireUser>
            }
          />

          {/* =================================================
             ADMIN
          ================================================= */}

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

          {/* =================================================
             HOME
          ================================================= */}

          <Route
            path="/"
            element={
              <RequireUser>
                <UserHome />
              </RequireUser>
            }
          />

          {/* =================================================
             EXPLORE
          ================================================= */}

          <Route
            path="/explore"
            element={
              <RequireUser>
                <RequireTour>
                  <UserExplore />
                </RequireTour>
              </RequireUser>
            }
          />

          {/* =================================================
             POI DETAIL
          ================================================= */}

          <Route
            path="/pois/:id"
            element={
              <RequireUser>
                <RequireTour>
                  <PoiDetail />
                </RequireTour>
              </RequireUser>
            }
          />

          {/* =================================================
             MAP
          ================================================= */}

          <Route
            path="/map"
            element={
              <RequireUser>
                <RequireTour>
                  <UserMap />
                </RequireTour>
              </RequireUser>
            }
          />

          {/* =================================================
             CHAT
          ================================================= */}

          <Route
            path="/chat"
            element={
              <RequireUser>
                <RequireTour>
                  <UserChat />
                </RequireTour>
              </RequireUser>
            }
          />

          {/* =================================================
             PROFILE
          ================================================= */}

          <Route
            path="/profile"
            element={
              <RequireUser>
                <UserProfile />
              </RequireUser>
            }
          />

          {/* =================================================
             ADD POI
          ================================================= */}

          <Route
            path="/add-poi"
            element={
              <RequireUser>
                <AddPoi />
              </RequireUser>
            }
          />

          {/* =================================================
             FALLBACK
          ================================================= */}

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