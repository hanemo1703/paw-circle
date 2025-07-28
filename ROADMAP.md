# Roadmap

Danh sách tính năng cần làm tiếp theo, xếp theo thứ tự ưu tiên đề xuất. Tick vào ô khi hoàn thành.

- [x] **1. Nối nút "Mình nghĩ đây là bé của mình" vào hệ thống nhắn tin**
  - File: `frontend/src/pages/posts/[id]/index.tsx`, `frontend/src/pages/messages/[userId]/index.tsx`
  - Đã làm: nút route sang `/messages/${post.author.id}?prefill=...`; trang tin nhắn đọc query `prefill` để điền sẵn nội dung "claim" vào ô soạn tin, rồi dọn query khỏi URL.

- [ ] **2. Ghi nhận việc "claim" khi thú cưng được nhận lại**
  - Quyết định: bỏ việc ghi nhận `claimant` ở backend — người dùng tự trao đổi qua nhắn tin (mục 1) để xác nhận với nhau, không cần hệ thống theo dõi ai đã "nhận" bài FOUND nào.

- [x] **3. Hệ thống thông báo (notifications)**
  - File: `backend/src/notifications/**` (mới), `messages.service.ts`, `messages.gateway.ts`, `donations.service.ts`; `frontend/src/lib/useNotifications.ts`, `frontend/src/components/NotificationsMenu.tsx`
  - Đã làm: `Notification` entity + module (list/markRead/markAllRead), tái dùng `MessagesGateway` (thêm `notifyNotification`) để đẩy realtime qua room `user:<id>` sẵn có. Bắn thông báo khi có tin nhắn mới và khi có donation mới cho campaign của mình. Header có icon chuông với badge chưa đọc + dropdown.

- [x] **4. Quên mật khẩu / xác thực email**
  - File: `backend/src/auth/auth.service.ts`, `auth.controller.ts`, `users/entities/user.entity.ts`; `frontend/src/pages/forgot-password/`, `frontend/src/pages/reset-password/`, `frontend/src/pages/login/index.tsx`
  - Đã làm: `POST /api/auth/forgot-password` (luôn trả thông báo chung chung để tránh lộ email nào đã đăng ký) sinh token ngẫu nhiên 30 phút lưu trên `User`; `POST /api/auth/reset-password` xác thực token + đặt mật khẩu mới. Trang `/forgot-password` và `/reset-password` + link "Quên mật khẩu?" ở `/login`.
  - Còn thiếu: **chưa có gửi email thật** — chưa cấu hình SMTP/mail provider nên link reset chỉ được log ra console backend (xem `Logger` trong `forgotPassword()`), cần cắm mail provider thật trước khi lên production. Xác thực email lúc đăng ký (email verification on signup) cũng chưa làm — nằm ngoài phạm vi đã sửa lần này.

- [ ] **5. Xem bản đồ (map view)**
  - File: `frontend/src/components/PostList.tsx:308` — hiện chỉ hiện "Chức năng xem trên bản đồ sắp ra mắt."
  - Cần làm: tích hợp maps SDK để ghim vị trí các bài lost/found/adoption (filter theo khu vực đã có sẵn).

- [ ] **6. Xác minh thanh toán donation thật**
  - File: `backend/src/donations/donations.service.ts:127-149`
  - Hiện tại: `donate()` chỉ insert row + cộng `currentAmount`, không xác minh — ai cũng có thể gọi API với số tiền giả.
  - Cần làm: thêm bước upload/xác nhận minh chứng chuyển khoản, hoặc tích hợp cổng thanh toán thật (VNPay/Momo).

- [ ] **7. Trang quản trị / kiểm duyệt (admin panel)**
  - Hiện tại: có sẵn field `role`, `isVerifiedOrg` trên user entity nhưng chưa có route/UI nào dùng đến.
  - Cần làm: trang admin để duyệt minh chứng donation, xác minh tổ chức cứu hộ, gỡ bài đăng vi phạm.
