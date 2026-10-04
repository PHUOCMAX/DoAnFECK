import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
   Search,
  Trash2,
  Shield,
  UserRound,
  RefreshCw,
  Loader2,
  Users,
  X,
  Menu,
  LogOut,
  LayoutDashboard,
  Plus,
  ShieldCheck,
  Activity,
} from "lucide-react";

import {
  getAdminUsers,
  updateAdminUserRole,
  deleteAdminUser,
} from "../../services/adminService";

function getStoredAdmin() {
  try {
    return JSON.parse(localStorage.getItem("admin_user") || "null");
  } catch {
    return null;
  }
}

export default function AdminUsers() {
    const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deletingUser, setDeletingUser] = useState(null);
  const [changingRole, setChangingRole] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const admin = useMemo(() => getStoredAdmin(), []);
  const token = localStorage.getItem("admin_token");
  console.log("ADMIN TOKEN:", token);

  async function loadUsers({ silent = false } = {}) {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const query = search.trim()
        ? `?search=${encodeURIComponent(search.trim())}`
        : "";

      const response = await getAdminUsers(token, query);

      setUsers(response?.data || []);
    } catch (err) {
      setError(
        err?.message ||
          "Không thể tải danh sách người dùng."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleSearch(event) {
    event.preventDefault();
    await loadUsers({ silent: true });
  }

  async function handleRoleChange(user) {
    const nextRole =
      user.role === "admin" ? "user" : "admin";

    const confirmed = window.confirm(
      `Bạn có chắc muốn đổi role của "${user.name}" thành ${nextRole.toUpperCase()}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setChangingRole(user.id);
      setError("");
      setSuccess("");

      await updateAdminUserRole(
        token,
        user.id,
        nextRole
      );

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === user.id
            ? {
                ...item,
                role: nextRole,
              }
            : item
        )
      );

      setSuccess(
        `Đã đổi role của ${user.name} thành ${nextRole.toUpperCase()}.`
      );
    } catch (err) {
      setError(
        err?.message ||
          "Không thể cập nhật role."
      );
    } finally {
      setChangingRole(null);
    }
  }

  async function handleDeleteUser(user) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa tài khoản "${user.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingUser(user.id);
      setError("");
      setSuccess("");

      await deleteAdminUser(token, user.id);

      setUsers((currentUsers) =>
        currentUsers.filter(
          (item) => item.id !== user.id
        )
      );

      setSuccess(
        `Đã xóa tài khoản ${user.name}.`
      );
    } catch (err) {
      setError(
        err?.message ||
          "Không thể xóa người dùng."
      );
    } finally {
      setDeletingUser(null);
    }
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
    }).format(date);
  }

  function isCurrentAdmin(user) {
    return (
      admin &&
      Number(admin.id) === Number(user.id)
    );
  }
  function logout() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_user");

  navigate("/admin/login", {
    replace: true,
  });
}
const totalUsers = users.length;

const adminCount = users.filter(
  (user) => user.role === "admin"
).length;

const normalUserCount = users.filter(
  (user) => user.role === "user"
).length;
   return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          aria-label="Đóng sidebar"
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-20 items-center border-b border-slate-100 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
            TG
          </div>

          <div className="ml-3">
            <p className="font-bold text-slate-900">
              Tour Guide
            </p>

            <p className="text-xs text-slate-400">
              Admin Console
            </p>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation */}
        
        <nav className="flex-1 space-y-1 p-4">
            <button
  onClick={() => {
    navigate("/admin?tab=monitoring");
    setSidebarOpen(false);
  }}
  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
>
  <Activity size={18} />
  Monitoring
</button>
          <button
            onClick={() => {
              navigate("/admin");
              setSidebarOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <LayoutDashboard size={18} />
            POI Management
          </button>

          <button
            onClick={() => {
              navigate("/admin");
              setSidebarOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Plus size={18} />
            Thêm POI
          </button>

          <button
            onClick={() => {
              setSidebarOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          >
            <Users size={18} />
            Quản lý User
          </button>
        </nav>

        {/* Admin profile */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {admin?.name?.[0]?.toUpperCase() || "A"}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {admin?.name || "Administrator"}
              </p>

              <p className="text-xs text-slate-500">
                Administrator
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={17} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="min-h-screen lg:pl-72">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
              >
                <Menu size={20} />
              </button>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Administration
                </p>

                <h1 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">
                  Quản lý User
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadUsers({ silent: true })}
              disabled={refreshing || loading}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >
              {refreshing ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw size={16} />
              )}

              <span className="hidden sm:inline">
                Làm mới
              </span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page description */}
          <div className="mb-6">
            <p className="text-sm text-slate-500">
              Quản lý tài khoản và quyền truy cập của người dùng.
            </p>
          </div>

          {/* Stats */}
          <section className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Tổng User
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {totalUsers}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Users size={21} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    User thường
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {normalUserCount}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <UserRound size={21} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    Admin
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {adminCount}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <ShieldCheck size={21} />
                </div>
              </div>
            </div>
          </section>

          {/* Search */}
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <form
              onSubmit={handleSearch}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Tìm theo tên hoặc email..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      loadUsers({ silent: true });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                    aria-label="Xóa tìm kiếm"
                  >
                    <X size={17} />
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || refreshing}
                className="min-h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Tìm kiếm
              </button>
            </form>
          </section>

          {/* Feedback */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex min-h-60 items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Loader2
                  size={20}
                  className="animate-spin"
                />
                Đang tải danh sách người dùng...
              </div>
            </div>
          )}

          {/* Empty */}
          {!loading && users.length === 0 && (
            <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Users
                  size={22}
                  className="text-slate-500"
                />
              </div>

              <h2 className="text-base font-semibold text-slate-900">
                Không tìm thấy người dùng
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Thử tìm kiếm bằng tên hoặc email khác.
              </p>
            </div>
          )}

          {/* Desktop / Tablet */}
          {!loading && users.length > 0 && (
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Người dùng
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Email
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Role
                      </th>

                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ngày tạo
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Thao tác
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => {
                      const currentAdmin =
                        isCurrentAdmin(user);

                      return (
                        <tr
                          key={user.id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  alt={user.name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                  <UserRound size={18} />
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-900">
                                  {user.name || "Chưa có tên"}
                                </p>

                                <p className="text-xs text-slate-400">
                                  ID #{user.id}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="max-w-[240px] truncate px-5 py-4 text-sm text-slate-600">
                            {user.email}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                user.role === "admin"
                                  ? "bg-violet-50 text-violet-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {user.role === "admin" ? (
                                <Shield size={13} />
                              ) : (
                                <UserRound size={13} />
                              )}

                              {user.role === "admin"
                                ? "ADMIN"
                                : "USER"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                            {formatDate(user.created_at)}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={
                                  currentAdmin ||
                                  changingRole === user.id ||
                                  deletingUser === user.id
                                }
                                onClick={() =>
                                  handleRoleChange(user)
                                }
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {changingRole ===
                                user.id ? (
                                  <Loader2
                                    size={15}
                                    className="animate-spin"
                                  />
                                ) : user.role ===
                                  "admin" ? (
                                  "Hạ quyền"
                                ) : (
                                  "Cấp admin"
                                )}
                              </button>

                              <button
                                type="button"
                                disabled={
                                  currentAdmin ||
                                  deletingUser === user.id ||
                                  changingRole === user.id
                                }
                                onClick={() =>
                                  handleDeleteUser(user)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {deletingUser ===
                                user.id ? (
                                  <Loader2
                                    size={15}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Trash2 size={15} />
                                )}

                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Mobile */}
          {!loading && users.length > 0 && (
            <div className="space-y-3 md:hidden">
              {users.map((user) => {
                const currentAdmin =
                  isCurrentAdmin(user);

                return (
                  <article
                    key={user.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="h-11 w-11 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <UserRound size={18} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold text-slate-900">
                            {user.name || "Chưa có tên"}
                          </h3>

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              user.role === "admin"
                                ? "bg-violet-50 text-violet-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {user.role === "admin"
                              ? "ADMIN"
                              : "USER"}
                          </span>
                        </div>

                        <p className="mt-1 break-all text-sm text-slate-500">
                          {user.email}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          ID #{user.id} ·{" "}
                          {formatDate(user.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={
                          currentAdmin ||
                          changingRole === user.id ||
                          deletingUser === user.id
                        }
                        onClick={() =>
                          handleRoleChange(user)
                        }
                        className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {changingRole === user.id
                          ? "Đang xử lý..."
                          : user.role === "admin"
                          ? "Hạ quyền"
                          : "Cấp admin"}
                      </button>

                      <button
                        type="button"
                        disabled={
                          currentAdmin ||
                          deletingUser === user.id ||
                          changingRole === user.id
                        }
                        onClick={() =>
                          handleDeleteUser(user)
                        }
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {deletingUser === user.id ? (
                          "Đang xóa..."
                        ) : (
                          <>
                            <Trash2 size={15} />
                            Xóa
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
  }