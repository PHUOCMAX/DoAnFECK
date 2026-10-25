
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

import UserHome from "./pages/user/UserHome";
import UserExplore from "./pages/user/UserExplore";
import PoiDetail from "./pages/user/PoiDetail";
import UserMap from "./pages/user/UserMap";
import UserChat from "./pages/user/UserChat";
import UserProfile from "./pages/user/UserProfile";
import AddPoi from "./pages/user/AddPoi";
import UserScanQR from "./pages/user/UserScanQR";
import UserPayment from "./pages/user/UserPayment";
import PaymentResult from "./pages/user/PaymentResult";

import WebGeofenceEngine from "./components/user/WebGeofenceEngine";
import TourHeartbeat from "./components/user/TourHeartbeat";

import {
  getTourAuthorization,
  getMySessionAuthorizations,
  getDeviceId,
  saveTourAuthorization,
} from "./services/userService";

import { PoiProvider } from "./stores/PoiProvider";

/* =====================================================
   REQUIRE USER
   Du khách không cần đăng nhập: được nhận diện bằng mã thiết bị
   (services/userService.js → getDeviceId). Giữ wrapper để các route
   không phải đổi; chỉ còn admin là đăng nhập.
===================================================== */

function RequireUser({ children }) {
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
          saveTourAuthorization(
            {
              ...activeAuthorization,
              deviceId: getDeviceId(),
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
        <TourHeartbeat />

        <Routes>
          {/* =================================================
             USER AUTH
          ================================================= */}

          {/* Du khách không đăng nhập nữa: link cũ chuyển về trang chủ */}
          <Route
            path="/login"
            element={<Navigate to="/" replace />}
          />

          <Route
            path="/register"
            element={<Navigate to="/" replace />}
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
          <Route
  path="/payment/result"
  element={
    <RequireUser>
      <PaymentResult />
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