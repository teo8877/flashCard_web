# Kotoba — Japanese Flashcards

Ứng dụng flashcard học Kanji và từ vựng tiếng Nhật, chạy hoàn toàn ở phía client.

## Chạy project

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
```

## Tính năng

- Tạo, sửa, xóa thẻ với xác nhận và thông báo trực quan.
- Chia từ vựng thành nhiều bài học, mỗi bài có danh sách thẻ riêng.
- Tự động chuyển dữ liệu cũ vào Bài 1 khi nâng cấp phiên bản.
- Bốn mặt học: Kanji, cách đọc, nghĩa tiếng Việt, âm Hán-Việt.
- Điều hướng bằng nút hoặc phím `Space`, `Enter`, `ArrowLeft`, `ArrowRight`.
- Tìm kiếm, lọc, trộn thẻ và trạng thái rỗng.
- Tự động lưu vào `localStorage`, có dữ liệu mẫu ban đầu.
- Có thể kết nối Supabase để đồng bộ dữ liệu giữa máy tính và điện thoại; chỉ admin đăng nhập mới được chỉnh sửa.
- Nhập và xuất dữ liệu JSON.
- Giao diện responsive, light/dark mode.

## Đồng bộ online bằng Supabase

1. Tạo project tại [supabase.com](https://supabase.com).
2. Mở SQL Editor, chạy toàn bộ file [`supabase-schema.sql`](./supabase-schema.sql).
3. Vào Authentication > Users, tạo tài khoản admin bằng email và mật khẩu.
4. Sao chép `.env.example` thành `.env.local`, rồi điền Project URL và anon key trong Project Settings > API.
5. Chạy lại app và deploy lên Vercel. Thêm hai biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trong Vercel Project Settings > Environment Variables.

Khi chưa cấu hình Supabase, app vẫn hoạt động offline bằng `localStorage`. Khi đã cấu hình, mọi thiết bị sẽ đọc cùng dữ liệu Supabase; người dùng thường chỉ có thể học, còn admin mới thấy các nút thêm/sửa/xóa.
