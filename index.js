require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

// --- Helper Function: ประมวลผลข้อมูล Config จาก Server 1 ---
// ฟังก์ชันนี้ทำหน้าที่ดึงข้อมูลจาก Server 1 และจัดการความไม่คงที่ของโครงสร้างข้อมูล
async function getConfigsFromServer1() {
  try {
    // 1. ดึงข้อมูลจาก URL ที่กำหนดใน Environment Variables
    const response = await fetch(process.env.CONFIG_SERVER_URL);
    if (!response.ok) {
      throw new Error(`Server 1 HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // 2. ตรวจสอบโครงสร้างข้อมูลที่ได้รับมา (Defensive Check)
    let configsArray = [];
    if (Array.isArray(data)) {
      configsArray = data; // กรณีที่ 1: ข้อมูลเป็น Array มาโดยตรง
    } else if (data.data && Array.isArray(data.data)) {
      configsArray = data.data; // กรณีที่ 2: ข้อมูลซ่อนอยู่ใน key "data"
    } else if (data.items && Array.isArray(data.items)) {
      configsArray = data.items; // กรณีที่ 3: ข้อมูลซ่อนอยู่ใน key "items"
    } else if (data.results && Array.isArray(data.results)) {
      configsArray = data.results; // กรณีที่ 4: ข้อมูลซ่อนอยู่ใน key "results"
    } else {
      throw new Error('Cannot find config array in Server 1 response');
    }

    // 3. แปลงโครงสร้างข้อมูล (Array of Arrays) ให้เป็น (Array of Objects)
    
    // 3a. ค้นหา "หัวตาราง" (headers) โดยมีตรรกะสำรอง (fallback)
    let headers = (data.headers && data.headers.length > 0) 
                  ? data.headers 
                  : configsArray[0]; // ใช้แถวแรกของ data เป็น headers หากไม่มี key 'headers'
    
    // 3b. ทำความสะอาด headers (ตัดช่องว่างที่อาจปนเปื้อนมา)
    const cleanedHeaders = headers.map(h => h.trim());
    
    // 3c. ดึงข้อมูล (value rows) โดยตัดแถวหัวตารางที่ซ้ำซ้อน (แถวแรก) ทิ้ง
    const valueRows = configsArray.slice(1); 

    // 3d. ทำการแปลงข้อมูล (Map) จาก Array เป็น Object
    const allConfigs = valueRows.map(row => {
      const configObject = {};
      cleanedHeaders.forEach((header, index) => {
        configObject[header] = row[index];
      });
      return configObject;
    });

    return allConfigs; // ส่งคืน Array of Objects ที่ผ่านการประมวลผลแล้ว

  } catch (error) {
    console.error('Error in getConfigsFromServer1:', error);
    throw error; // ส่งต่อ Error ให้ Route Handler จัดการ
  }
}

// --- 1. Endpoint: GET /configs/{droneId} ---
app.get('/configs/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params; // รับ droneId (String) จาก URL

    // 1. เรียกใช้ Helper Function เพื่อดึงข้อมูลที่ผ่านการประมวลผลแล้ว
    const allConfigs = await getConfigsFromServer1();

    // 2. ค้นหาข้อมูล Config ที่ตรงกัน
    // (แปลงทั้ง droneId และ item.drone_id เป็น Number เพื่อการเปรียบเทียบที่แม่นยำ)
    const searchId = parseInt(droneId, 10);
    const config = allConfigs.find(item => {
      const itemId = parseInt(item.drone_id, 10); // แปลงค่าในข้อมูลเป็น Number
      return itemId === searchId;
    });

    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    // 3. กรองข้อมูลเฉพาะ fields ที่โจทย์กำหนด
    const result = {
      drone_id: config.drone_id,
      drone_name: config.drone_name,
      light: config.light,
      country: config.country,
      weight: config.weight
    };

    res.json(result);

  } catch (error) {
    console.error('Error in /configs/:droneId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- 2. Endpoint: GET /status/{droneId} ---
app.get('/status/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params; // รับ droneId (String) จาก URL

    // 1. เรียกใช้ Helper Function เพื่อดึงข้อมูลที่ผ่านการประมวลผลแล้ว
    const allConfigs = await getConfigsFromServer1();

    // 2. ค้นหาข้อมูล Config ที่ตรงกัน (ใช้ตรรกะเดียวกับ /configs)
    const searchId = parseInt(droneId, 10);
    const config = allConfigs.find(item => {
      const itemId = parseInt(item.drone_id, 10);
      return itemId === searchId;
    });

    if (!config) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // 3. กรองข้อมูลเฉพาะ field "condition"
    const result = {
      condition: config.condition
    };

    res.json(result);

  } catch (error)
 {
    console.error('Error in /status/:droneId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- 3. Endpoint: GET /logs/{droneId} ---
app.get('/logs/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params;

    // สร้าง Query Parameters สำหรับ PocketBase (Server 2)
    const filter = `(drone_id='${droneId}')`;
    const sort = '-created';
    const perPage = 12;

    const url = `${process.env.LOG_SERVER_URL}?filter=${encodeURIComponent(filter)}&sort=${sort}&perPage=${perPage}`;

    const response = await fetch(url, { // ใช้ fetch (Native)
      headers: {
        'Authorization': `Bearer ${process.env.LOG_API_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch logs from Server 2');
    }
    const logsData = await response.json();

    // กรองข้อมูล logs เฉพาะ fields ที่โจทย์กำหนด
    const result = logsData.items.map(log => ({
        drone_id: log.drone_id,
        drone_name: log.drone_name,
        created: log.created,
        country: log.country,
        celsius: log.celsius
      }));
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- 4. Endpoint: POST /logs ---
app.post('/logs', async (req, res) => {
  try {
    const { drone_id, drone_name, country, celsius } = req.body;
    const dataToCreate = { drone_id, drone_name, country, celsius };

    const response = await fetch(process.env.LOG_SERVER_URL, { // ใช้ fetch (Native)
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LOG_API_TOKEN}`
      },
      body: JSON.stringify(dataToCreate)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error from Server 2:', errorData);
      throw new Error('Failed to create log on Server 2');
    }
    const newLog = await response.json();
    res.status(201).json(newLog); // ตอบกลับด้วยสถานะ 201 (Created)
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// --- ส่วนเริ่มต้นการทำงานของเซิร์ฟเวอร์ ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});