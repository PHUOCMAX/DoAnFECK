import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPendingPois,
  reviewPoi,
} from "../../services/adminService";

function AdminDashboard() {
  const navigate = useNavigate();

  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");

  const token = localStorage.getItem("admin_token");

  const adminUser = JSON.parse(
    localStorage.getItem("admin_user") || "null"
  );

  async function loadPois() {
    if (!token || adminUser?.role !== "admin") {
      navigate("/admin/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await getPendingPois(token);

      setPois(data.pois || []);
    } catch (error) {
      setError(
        error.message ||
          "Không thể tải danh sách POI."
      );

      if (
        error.message?.includes("đăng nhập") ||
        error.message?.includes("quản trị viên")
      ) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");

        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPois();
  }, []);

  async function handleReview(poiId, status) {
    try {
      setProcessingId(poiId);
      setError("");

      await reviewPoi(
        token,
        poiId,
        status
      );

      setPois((currentPois) =>
        currentPois.filter(
          (poi) => poi.id !== poiId
        )
      );
    } catch (error) {
      setError(
        error.message ||
          "Không thể cập nhật POI."
      );
    } finally {
      setProcessingId(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");

    navigate("/admin/login");
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <div>
          <h2>Đang tải...</h2>
          <p>Đang lấy danh sách POI.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* HEADER */}

      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Admin Dashboard
          </h1>

          <p style={styles.subtitle}>
            Multilingual Tour Guide
          </p>
        </div>

        <div style={styles.headerRight}>
          <div style={styles.adminInfo}>
            <strong>
              {adminUser?.name || "Admin"}
            </strong>

            <span>
              {adminUser?.email}
            </span>
          </div>

          <button
            onClick={handleLogout}
            style={styles.logout}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* MAIN */}

      <main style={styles.container}>
        {/* STAT */}

        <div style={styles.stats}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>
              POI chờ duyệt
            </span>

            <strong style={styles.statNumber}>
              {pois.length}
            </strong>
          </div>

          <div style={styles.statCard}>
            <span style={styles.statLabel}>
              Trạng thái
            </span>

            <strong style={styles.pendingText}>
              Pending
            </strong>
          </div>
        </div>

        {/* TITLE */}

        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              Danh sách POI chờ duyệt
            </h2>

            <p style={styles.sectionDescription}>
              Kiểm tra thông tin trước khi đưa POI
              lên hệ thống.
            </p>
          </div>

          <button
            onClick={loadPois}
            style={styles.refresh}
          >
            Làm mới
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {/* EMPTY */}

        {pois.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>
              ✓
            </div>

            <h3>
              Không có POI chờ duyệt
            </h3>

            <p>
              Hiện tại tất cả yêu cầu đã được xử lý.
            </p>
          </div>
        ) : (
          <div style={styles.list}>
            {pois.map((poi) => (
              <div
                key={poi.id}
                style={styles.card}
              >
                {/* CARD HEADER */}

                <div style={styles.cardHeader}>
                  <div>
                    <span style={styles.badge}>
                      PENDING
                    </span>

                    <h3 style={styles.poiTitle}>
                      {poi.name?.vi ||
                        "Không có tên"}
                    </h3>
                  </div>

                  <span style={styles.poiId}>
                    #{poi.id}
                  </span>
                </div>

                {/* CONTENT */}

                <div style={styles.info}>
                  <div style={styles.infoRow}>
                    <strong>
                      Tên tiếng Việt
                    </strong>

                    <span>
                      {poi.name?.vi || "-"}
                    </span>
                  </div>

                  <div style={styles.infoRow}>
                    <strong>
                      English
                    </strong>

                    <span>
                      {poi.name?.en || "-"}
                    </span>
                  </div>

                  <div style={styles.infoRow}>
                    <strong>
                      中文
                    </strong>

                    <span>
                      {poi.name?.zh || "-"}
                    </span>
                  </div>

                  <div style={styles.infoRow}>
                    <strong>
                      Mô tả
                    </strong>

                    <span>
                      {poi.description?.vi ||
                        "-"}
                    </span>
                  </div>

                  <div style={styles.infoRow}>
                    <strong>
                      Thành phố
                    </strong>

                    <span>
                      {poi.city || "-"}
                    </span>
                  </div>

                  <div style={styles.infoRow}>
                    <strong>
                      Danh mục
                    </strong>

                    <span>
                      {poi.category || "-"}
                    </span>
                  </div>

                  <div style={styles.infoRow}>
                    <strong>
                      Tọa độ
                    </strong>

                    <span>
                      {poi.latitude},{" "}
                      {poi.longitude}
                    </span>
                  </div>

                  <div style={styles.infoRow}>
                    <strong>
                      Bán kính
                    </strong>

                    <span>
                      {poi.radius}m
                    </span>
                  </div>
                </div>

                {/* ACTION */}

                <div style={styles.actions}>
                  <button
                    disabled={
                      processingId === poi.id
                    }
                    onClick={() =>
                      handleReview(
                        poi.id,
                        "approved"
                      )
                    }
                    style={{
                      ...styles.approve,
                      opacity:
                        processingId === poi.id
                          ? 0.6
                          : 1,
                    }}
                  >
                    Duyệt POI
                  </button>

                  <button
                    disabled={
                      processingId === poi.id
                    }
                    onClick={() =>
                      handleReview(
                        poi.id,
                        "rejected"
                      )
                    }
                    style={{
                      ...styles.reject,
                      opacity:
                        processingId === poi.id
                          ? 0.6
                          : 1,
                    }}
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f6f8",
  },

  header: {
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    padding: "18px 40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    margin: 0,
    fontSize: 24,
    color: "#111827",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#6b7280",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 20,
  },

  adminInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 3,
  },

  logout: {
    padding: "9px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#ffffff",
    cursor: "pointer",
  },

  container: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: 40,
  },

  stats: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 35,
  },

  statCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  statLabel: {
    color: "#6b7280",
    fontSize: 14,
  },

  statNumber: {
    fontSize: 30,
    color: "#111827",
  },

  pendingText: {
    color: "#b45309",
    fontSize: 20,
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 20,
  },

  sectionDescription: {
    margin: "6px 0 0",
    color: "#6b7280",
  },

  refresh: {
    padding: "10px 16px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#ffffff",
    cursor: "pointer",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 24,
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },

  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 6,
    background: "#fef3c7",
    color: "#92400e",
    fontSize: 11,
    fontWeight: 700,
  },

  poiTitle: {
    margin: "10px 0 0",
    fontSize: 19,
    color: "#111827",
  },

  poiId: {
    color: "#9ca3af",
    fontWeight: 600,
  },

  info: {
    borderTop: "1px solid #f3f4f6",
    borderBottom: "1px solid #f3f4f6",
    padding: "12px 0",
  },

  infoRow: {
    display: "grid",
    gridTemplateColumns: "160px 1fr",
    gap: 16,
    padding: "7px 0",
    color: "#374151",
  },

  actions: {
    display: "flex",
    gap: 12,
    marginTop: 20,
  },

  approve: {
    flex: 1,
    padding: "12px 16px",
    border: "none",
    borderRadius: 8,
    background: "#16a34a",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  },

  reject: {
    flex: 1,
    padding: "12px 16px",
    border: "none",
    borderRadius: 8,
    background: "#dc2626",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
  },

  empty: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 60,
    textAlign: "center",
  },

  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 15px",
    fontSize: 22,
    fontWeight: 700,
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f6f8",
  },
};

export default AdminDashboard;