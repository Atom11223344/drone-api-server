# Assignment 1: Drone API Server

นี่คือ API Server สำหรับโปรเจกต์ Drone Tracking

## วิธีการ Run (สำหรับ Development)

1.  Clone repository นี้
2.  รัน `npm install`
3.  สร้างไฟล์ `.env` โดยอ้างอิงจาก `.env.example`
4.  ใส่ Environment Variables ดังนี้:
    - `CONFIG_SERVER_URL=...`
    - `LOG_SERVER_URL=...`
    - `LOG_API_TOKEN=...`
5.  รัน `node index.js` (หรือ `npm start`)

## API Endpoints

-   `GET /configs/:droneId` - ดึงข้อมูล config ของ drone
-   `GET /status/:droneId` - ดึงสถานะ condition ของ drone
-   `GET /logs/:droneId` - ดึง logs ล่าสุด 12 รายการ
-   `POST /logs` - สร้าง log ใหม่