# Multilingual Tour Guide

Ứng dụng hướng dẫn du lịch đa ngôn ngữ gồm mobile Expo, web React/Vite và API
Express/MySQL. Mobile là client sản phẩm chính; web hiện là màn hình minh họa
dữ liệu shared.

## Yêu cầu

- Node.js 20 trở lên và npm
- MySQL 8 trở lên
- Expo Go hoặc Android Emulator/iOS Simulator để chạy mobile

## Thiết lập lần đầu

1. Cài dependencies cho từng ứng dụng:

   ```bash
   npm --prefix backend install
   npm --prefix frontend/mobile install
   npm --prefix frontend/web install
   ```

2. Tạo `backend/.env` từ `backend/.env.example`, điền thông tin MySQL và một
   `JWT_SECRET` ngẫu nhiên, dài.

3. Tạo database đã khai báo trong `DB_NAME`, rồi chạy migration:

   ```bash
   mysql -u <user> -p <database_name> < backend/database/migrations/001_create_users.sql
   mysql -u <user> -p <database_name> < backend/database/migrations/002_create_pois.sql
   mysql -u <user> -p <database_name> < backend/database/migrations/003_add_poi_approval.sql
   ```

4. Tạo `frontend/mobile/.env` từ `frontend/mobile/.env.example` và đặt
   `EXPO_PUBLIC_API_URL` theo địa chỉ API có thể truy cập từ thiết bị.
   - Máy thật: dùng IP LAN của máy chạy backend, ví dụ `http://192.168.1.10:5000`.
   - Android Emulator: thông thường dùng `http://10.0.2.2:5000`.
   - iOS Simulator: có thể dùng `http://localhost:5000`.

`EXPO_PUBLIC_API_URL` được đóng gói vào ứng dụng, nên tuyệt đối không để mật
khẩu, token bí mật hoặc DB credentials trong biến này.

## Chạy project

Chạy backend trước:

```bash
npm run backend:dev
```

Sau đó, ở terminal khác:

```bash
npm run mobile:start
npm run web:dev
```

Các lệnh mobile tiện dụng khác: `npm run mobile:android`, `npm run mobile:ios`.
API health check nằm tại `GET /api/health`.

Người dùng đã đăng nhập có thể gửi POI từ nút **Thêm** ở thanh điều hướng
mobile. Mỗi POI được lưu với trạng thái `pending`; `GET /api/pois` chỉ trả POI
đã được duyệt (`approved`), nên chúng không thể tự xuất hiện công khai.

## Duyệt POI

Sau khi chạy migration `003`, mọi tài khoản cũ có role `user`. Chỉ định một
quản trị viên bằng lệnh SQL sau (thay email bằng tài khoản của bạn):

```sql
UPDATE users SET role = 'admin' WHERE email = '<admin-email>';
```

Quản trị viên lấy POI chờ duyệt bằng `GET /api/admin/pois?status=pending` và
duyệt/từ chối bằng `PATCH /api/admin/pois/:poiId/status` với JSON body
`{ "status": "approved" }` hoặc `{ "status": "rejected" }`. Hai endpoint
này yêu cầu Bearer token của tài khoản admin.

## Kiểm tra chất lượng

```bash
npm run check
```

Lệnh này chạy unit test backend, type check mobile và lint web.

## Cấu trúc

```text
backend/                 Express API, middleware, migration MySQL
frontend/mobile/         Expo/React Native app
frontend/web/            React/Vite demo web
shared/                  Type và dữ liệu dùng chung giữa các client
```
