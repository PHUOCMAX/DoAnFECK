import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Clock3,
  Globe2,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { LANGUAGES } from "@shared/constants/languages";

import {
  createAdminPoi,
  deleteAdminPoi,
  getAdminPois,
  reviewPoi,
  updateAdminPoi,
} from "../../services/adminService";

const EMPTY_FORM = {
  name: {
    vi: "",
  },

  description: {
    vi: "",
  },

  city: "ho-chi-minh",
  category: "tourism",

  latitude: "",
  longitude: "",
  radius: "100",

  image: "",

  audio: {},
};

function clonePoiToForm(poi) {
  return {
    name: {
      vi: poi.name?.vi || "",
    },

    description: {
      vi: poi.description?.vi || "",
    },

    city: poi.city || "ho-chi-minh",
    category: poi.category || "tourism",

    latitude: String(poi.latitude ?? ""),
    longitude: String(poi.longitude ?? ""),
    radius: String(poi.radius ?? "100"),

    image: poi.image || "",

    audio: {},
  };
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    pending: {
      label: "Chờ duyệt",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
    },

    approved: {
      label: "Đã duyệt",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },

    rejected: {
      label: "Từ chối",
      className: "bg-red-50 text-red-700 ring-red-200",
    },
  };

  const item = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${item.className}`}
    >
      {item.label}
    </span>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
      />
    </label>
  );
}

function PoiFormModal({ editingPoi, onClose, onSaved }) {
  const token = localStorage.getItem("admin_token");

  const [form, setForm] = useState(
    editingPoi ? clonePoiToForm(editingPoi) : EMPTY_FORM
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] =
  useState(null);

  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateVietnamese(field, value) {
    setForm((current) => ({
      ...current,
      [field]: {
        ...current[field],
        vi: value,
      },
    }));
  }

  async function submit(event) {
    event.preventDefault();

    setError("");
    setSaving(true);

  const metadata = {
  name: {
    vi: form.name.vi.trim(),
  },

  description: {
    vi: form.description.vi.trim(),
  },

  city: form.city.trim(),
  category: form.category,
  latitude: Number(form.latitude),
  longitude: Number(form.longitude),
  radius: Number(form.radius),
  image: "",
  audio: {},
};

const payload = new FormData();

payload.append(
  "data",
  JSON.stringify(metadata)
);

if (imageFile) {
  payload.append(
    "image",
    imageFile
  );
}

    try {
      const result = editingPoi
        ? await updateAdminPoi(token, editingPoi.id, payload)
        : await createAdminPoi(token, payload);

      onSaved(result.poi);
    } catch (err) {
      setError(err.message || "Không thể lưu POI.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              POI CONTENT
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {editingPoi ? "Chỉnh sửa POI" : "Thêm POI"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 sm:p-6">
          {/* Translation notice */}
          <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Globe2 size={18} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-sky-900">
                  Nhập nội dung bằng Tiếng Việt
                </h3>

                <p className="mt-1 text-sm leading-6 text-sky-700">
                  Hệ thống sẽ tự động dịch tên và mô tả sang 15 ngôn ngữ
                  bằng dịch vụ dịch thuật của hệ thống.
                </p>

                <p className="mt-1 text-xs text-sky-600">
                  Không cần nhập thủ công nội dung của từng ngôn ngữ.
                </p>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Vietnamese name */}
            <InputField
              label="Tên POI (Tiếng Việt)"
              value={form.name.vi}
              onChange={(event) =>
                updateVietnamese("name", event.target.value)
              }
              placeholder="Ví dụ: Dinh Độc Lập"
              required
            />

            {/* Vietnamese description */}
            <label className="block md:row-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Mô tả (Tiếng Việt)
              </span>

              <textarea
                rows={5}
                value={form.description.vi}
                onChange={(event) =>
                  updateVietnamese("description", event.target.value)
                }
                placeholder="Nhập mô tả về địa điểm..."
                required
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </label>

            {/* City */}
            <InputField
              label="City"
              value={form.city}
              onChange={(event) =>
                update("city", event.target.value)
              }
              placeholder="ho-chi-minh"
              required
            />

            {/* Category */}
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Category
              </span>

              <select
                value={form.category}
                onChange={(event) =>
                  update("category", event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="tourism">Tourism</option>
                <option value="food">Food</option>
              </select>
            </label>

            {/* Radius */}
            <InputField
              label="Radius (m)"
              type="number"
              value={form.radius}
              onChange={(event) =>
                update("radius", event.target.value)
              }
              placeholder="100"
              required
            />

            {/* Latitude */}
            <InputField
              label="Latitude"
              type="number"
              value={form.latitude}
              onChange={(event) =>
                update("latitude", event.target.value)
              }
              placeholder="10.7769"
              required
            />

            {/* Longitude */}
            <InputField
              label="Longitude"
              type="number"
              value={form.longitude}
              onChange={(event) =>
                update("longitude", event.target.value)
              }
              placeholder="106.7009"
              required
            />

            {/* Image */}
         <label className="block md:col-span-2">
  <span className="mb-2 block text-sm font-medium text-slate-700">
    Hình ảnh POI
  </span>

  <input
    type="file"
    accept="image/jpeg,image/png,image/webp,image/gif"
    onChange={(event) => {
      setImageFile(
        event.target.files?.[0] || null
      );
    }}
    className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-700"
  />

  <p className="mt-2 text-xs text-slate-500">
    JPG, PNG, WEBP hoặc GIF · tối đa 5 MB
  </p>

  {form.image && !imageFile && (
    <div className="mt-3">
      <p className="mb-2 text-xs font-medium text-slate-500">
        Ảnh hiện tại
      </p>

      <img
        src={
          form.image.startsWith("http")
            ? form.image
            : `${
                import.meta.env.VITE_API_URL ||
                "http://192.168.1.7:5001"
              }${form.image}`
        }
        alt=""
        className="h-32 w-48 rounded-xl object-cover ring-1 ring-slate-200"
      />
    </div>
  )}

  {imageFile && (
    <p className="mt-2 text-xs font-semibold text-slate-700">
      Đã chọn: {imageFile.name}
    </p>
  )}
</label>
          </div>

          {/* Translation status */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
                <Globe2 size={18} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Tự động dịch
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Nội dung Tiếng Việt sẽ được tạo bản dịch cho{" "}
                  <span className="font-semibold text-slate-700">
                    {LANGUAGES.length} ngôn ngữ
                  </span>{" "}
                  sau khi lưu POI.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {LANGUAGES.map((language) => (
                <span
                  key={language.code}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600"
                >
                  {language.nativeName || language.name}
                </span>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                "Đang dịch và lưu..."
              ) : editingPoi ? (
                <>
                  <Check size={17} />
                  Lưu thay đổi
                </>
              ) : (
                <>
                  <Plus size={17} />
                  Tạo POI
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PoiCard({ poi, onEdit, onDelete, onReview }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {/* Header */}
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <StatusBadge status={poi.status} />

            <h3 className="mt-3 truncate text-lg font-bold text-slate-900">
              {poi.name?.vi ||
                poi.name?.en ||
                "POI không tên"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {poi.city} · {poi.category}
            </p>
          </div>

          <span className="shrink-0 text-xs font-semibold text-slate-400">
            #{poi.id}
          </span>
        </div>
      </div>

      {/* Languages */}
      <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
        {LANGUAGES.map((lang) => (
          <div
            key={lang.code}
            className="bg-white p-4"
          >
            <p className="text-xs font-medium text-slate-400">
              {lang.nativeName || lang.name}
            </p>

            <p className="mt-1 break-words text-sm font-semibold text-slate-800">
              {poi.name?.[lang.code] || "—"}
            </p>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="p-5">
        <p className="line-clamp-3 text-sm leading-6 text-slate-600">
          {poi.description?.vi ||
            poi.description?.en ||
            "Chưa có mô tả."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
            Lat: {poi.latitude}
          </span>

          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
            Lng: {poi.longitude}
          </span>

          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5">
            Bán kính: {poi.radius}m
          </span>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2">
          {poi.status === "pending" && (
            <>
              <button
                onClick={() =>
                  onReview(poi.id, "approved")
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                <Check size={15} />
                Duyệt
              </button>

              <button
                onClick={() =>
                  onReview(poi.id, "rejected")
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                <XCircle size={15} />
                Từ chối
              </button>
            </>
          )}

          <button
            onClick={() => onEdit(poi)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Pencil size={15} />
            Sửa
          </button>

          <button
            onClick={() => onDelete(poi.id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 size={15} />
            Xóa
          </button>
        </div>
      </div>
    </article>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("pending");
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const token = localStorage.getItem("admin_token");
  const user = JSON.parse(
    localStorage.getItem("admin_user") || "null"
  );

  useEffect(() => {
    if (!token || user?.role !== "admin") {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate, token, user?.role]);

  async function loadPois(nextTab = tab) {
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const data = await getAdminPois(token, nextTab);

      setPois(data.pois || []);
    } catch (err) {
      setError(
        err.message || "Không tải được POI."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPois(tab);
  }, [tab]);

  async function handleReview(id, status) {
    try {
      await reviewPoi(token, id, status);

      setPois((items) =>
        items.filter((item) => item.id !== id)
      );
    } catch (err) {
      setError(
        err.message || "Không thể duyệt POI."
      );
    }
  }

  async function handleDelete(id) {
    if (
      !window.confirm(
        "Xóa POI này? Thao tác không thể hoàn tác."
      )
    ) {
      return;
    }

    try {
      await deleteAdminPoi(token, id);

      setPois((items) =>
        items.filter((item) => item.id !== id)
      );
    } catch (err) {
      setError(
        err.message || "Không thể xóa POI."
      );
    }
  }

  function handleSaved(poi) {
    setModal(null);

    setPois((items) => {
      const exists = items.some(
        (item) => item.id === poi.id
      );

      return exists
        ? items.map((item) =>
            item.id === poi.id ? poi : item
          )
        : [poi, ...items];
    });
  }

  function logout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");

    navigate("/admin/login", {
      replace: true,
    });
  }

  const title = useMemo(
    () =>
      ({
        pending: "POI chờ duyệt",
        approved: "POI đã duyệt",
        rejected: "POI bị từ chối",
      })[tab],
    [tab]
  );

  const tabs = [
    {
      key: "pending",
      label: "Chờ duyệt",
      icon: Clock3,
    },
    {
      key: "approved",
      label: "Đã duyệt",
      icon: Check,
    },
    {
      key: "rejected",
      label: "Từ chối",
      icon: XCircle,
    },
  ];

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

        <nav className="flex-1 space-y-1 p-4">
          <button
            onClick={() => {
              setTab("pending");
              setSidebarOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
          >
            <LayoutDashboard size={18} />
            POI Management
          </button>

          <button
            onClick={() => {
              setModal("create");
              setSidebarOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Plus size={18} />
            Thêm POI
          </button>
                    <button
            onClick={() => {
              navigate("/admin/users");
              setSidebarOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Users size={18} />
            Quản lý User
          </button>
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user?.name || "Administrator"}
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
                  {title}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => loadPois(tab)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw size={16} />

                <span className="hidden sm:inline">
                  Làm mới
                </span>
              </button>

              <button
                onClick={() => setModal("create")}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 sm:px-4"
              >
                <Plus size={17} />

                <span className="hidden sm:inline">
                  Thêm POI
                </span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Stats */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={Clock3}
              label="POI hiện tại"
              value={pois.length}
            />

            <StatCard
              icon={Globe2}
              label="Languages"
              value={LANGUAGES.length}
            />

            <StatCard
              icon={ShieldCheck}
              label="Role"
              value="ADMIN"
            />
          </section>

          {/* Content */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 pt-4 sm:px-6">
              <div className="flex gap-2 overflow-x-auto">
                {tabs.map((item) => {
                  const Icon = item.icon;

                  const active = tab === item.key;

                  return (
                    <button
                      key={item.key}
                      onClick={() => setTab(item.key)}
                      className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition ${
                        active
                          ? "border-slate-900 text-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <XCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  <span>{error}</span>
                </div>
              )}

              {loading ? (
                <div className="flex min-h-60 items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />

                    <p className="mt-3 text-sm text-slate-500">
                      Đang tải dữ liệu...
                    </p>
                  </div>
                </div>
              ) : pois.length === 0 ? (
                <div className="flex min-h-60 flex-col items-center justify-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <LayoutDashboard size={24} />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-900">
                    Chưa có POI
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Danh sách {tab} hiện đang trống.
                  </p>

                  {tab === "pending" && (
                    <button
                      onClick={() => setModal("create")}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      <Plus size={17} />
                      Thêm POI
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid gap-5 xl:grid-cols-2">
                  {pois.map((poi) => (
                    <PoiCard
                      key={poi.id}
                      poi={poi}
                      onEdit={(item) => setModal(item)}
                      onDelete={handleDelete}
                      onReview={handleReview}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Modal */}
      {modal && (
        <PoiFormModal
          editingPoi={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}