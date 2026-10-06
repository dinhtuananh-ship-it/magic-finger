# ✋ Finger Count AI — Web nhận diện ngón tay

Web AI kết nối camera, nhận diện bàn tay real-time, đếm số ngón đang giơ (0–5 mỗi tay, 0–10 hai tay) + vẽ skeleton.

Chạy 100% trên trình duyệt với **MediaPipe Hands**, không cần server AI, không gửi video đi đâu.

## Cách chạy

**Cách 1: Mở nhanh (khuyên dùng VS Code)**
- Cài extension "Live Server", chuột phải `index.html` → Open with Live Server

**Cách 2: Python**
```bash
cd finger-count-ai
python -m http.server 8000
```
Mở: http://localhost:8000

> ⚠️ Không mở bằng `file://` (double-click file). Chrome sẽ chặn camera. Phải dùng `localhost` hoặc `https`.

## Tính năng
- [x] Bật/tắt camera
- [x] Nhận diện tối đa 2 bàn tay
- [x] Vẽ skeleton (khung xương) real-time
- [x] Đếm 0–5 mỗi tay, tổng 0–10
- [x] Hiển thị tên ngón đang giơ: Cái, Trỏ, Giữa, Áp út, Út
- [x] Chế độ selfie mirror

## Mẹo nhận diện chuẩn
- Đủ sáng, nền đơn giản
- Tay cách camera 40–80cm
- Xòe rõ ngón, không che ngón khác

## Công nghệ
- MediaPipe Hands (CDN jsdelivr)
- Camera Utils + Drawing Utils
- HTML/CSS/JS thuần
