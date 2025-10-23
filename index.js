require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

// --- Helper Function: จัดการข้อมูล Server 1 ---
async function getConfigsFromServer1() {
  try {
    // 1. ดึงข้อมูล
    const response = await fetch(process.env.CONFIG_SERVER_URL);
    if (!response.ok) {
      throw new Error(`Server 1 HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // --- DEBUG: พิมพ์ "ข้อมูลดิบ" ที่ Vercel เห็นจริงๆ ---
    console.log('DEBUG: Raw data from Server 1:', JSON.stringify(data));
    // --- END DEBUG ---

    // 2. ตรรกะ "ป้องกัน": เช็กว่าข้อมูลจริงซ่อนอยู่ที่ไหน
    let configsArray = [];
    if (Array.isArray(data)) {
      configsArray = data; // ถ้ามันส่ง Array มาตรงๆ
    } else if (data.data && Array.isArray(data.data)) {
      configsArray = data.data; // ถ้ามันซ่อนอยู่ใน "data"
    } else if (data.items && Array.isArray(data.items)) {
      configsArray = data.items; // ถ้ามันซ่อนอยู่ใน "items"
    } else if (data.results && Array.isArray(data.results)) {
      configsArray = data.results; // ถ้ามันซ่อนอยู่ใน "results"
    } else {
      throw new Error('Cannot find config array in Server 1 response');
    }

    // 3. แปลง "Array ของ Array" ให้เป็น "Array ของ Object"
    
    // 3a. หา "หัวตาราง"
    let headers = (data.headers && data.headers.length > 0) 
                  ? data.headers 
                  : configsArray[0];
    
    // 3b. (ป้องกัน Error ถ้า headers ยังว่างเปล่า)
    if (!headers || headers.length === 0) {
      throw new Error('Could not determine headers from Server 1 data');
    }
                  
    const cleanedHeaders = headers.map(h => h.trim());
    
    // 3c. ดึง "ข้อมูล" (ตัดแถวหัวตารางที่ซ้ำซ้อนทิ้ง)
    const valueRows = configsArray.slice(1); 

    // 3d. แปลงร่าง
    const allConfigs = valueRows.map(row => {
      const configObject = {};
      cleanedHeaders.forEach((header, index) => {
        configObject[header] = row[index];
      });
      return configObject;
    });

    return allConfigs; 

  } catch (error) {
    console.error('Error in getConfigsFromServer1:', error);
    throw error; // โยน Error ต่อไปให้ app.get
  }
}

// (โค้ดส่วนที่เหลือ `app.get`, `app.post`, `app.listen` ให้ "คัดลอก" มาจากโค้ด "รีเซ็ต" อันก่อนหน้านี้ได้เลยครับ มันถูกต้องแล้ว)
// ...
// ... (วางโค้ด GET /configs, GET /status, GET /logs, POST /logs, app.listen) ...
// ...