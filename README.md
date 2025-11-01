# Assignment #1: Drone API Server

## Project Description
โปรเจกต์นี้คือ API Server ที่สร้างขึ้นด้วย Node.js และ Express.js ทำหน้าที่เป็นตัวกลาง (Middleware) ในการดึงข้อมูลจากเซิร์ฟเวอร์ภายนอกสองแห่ง (Drone Config Server และ Drone Log Server) และนำเสนอข้อมูลเหล่านั้นผ่าน Endpoints ที่กำหนดตามข้อกำหนดของ Assignment

## How to Run (วิธีการ Run)

1.  Clone repository นี้
2.  ติดตั้ง dependencies ที่จำเป็น:
    ```bash
    npm install
    ```
3.  สร้างไฟล์ `.env` ที่ root ของโปรเจกต์ และกำหนดค่าตัวแปรด้านล่างนี้
4.  รันเซิร์ฟเวอร์:
    ```bash
    npm start
    ```

### Environment Variables
โปรเจกต์นี้ต้องการตัวแปร Environment Variables ดังต่อไปนี้เพื่อเชื่อมต่อกับเซิร์ฟเวอร์ภายนอก:

* **`CONFIG_SERVER_URL`**: URL ของ Drone Config Server (Server 1)
* **`LOG_SERVER_URL`**: URL ของ Drone Log Server (Server 2)
* **`LOG_API_TOKEN`**: Bearer Token สำหรับ Server 2