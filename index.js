require('dotenv').config();
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // หรือ import axios
const app = express();
app.use(express.json()); // ทำให้ Express อ่าน JSON จาก request body ได้ (สำหรับ POST)
const PORT = process.env.PORT || 3000; // สำหรับการ Deploy

// GET /configs/{droneId}
app.get('/configs/:droneId', async (req, res) => {
  try {
    // 1. ดึงเลข ID จาก URL ที่ผู้ใช้เรียกมา
    const { droneId } = req.params; // [cite: 27] (ถ้าเรียก /configs/3001, droneId จะเป็น "3001")

    // 2. ไปดึงข้อมูล "ทั้งหมด" จาก Server 1
    const response = await fetch(process.env.CONFIG_SERVER_URL); // 
    const allConfigs = await response.json(); // แปลง response เป็น JSON array

    // 3. ค้นหาเฉพาะ config ที่ตรงกับ ID ที่เราต้องการ
    const config = allConfigs.find(item => item.drone_id == droneId); // 

    // 4. (เผื่อหาไม่เจอ)
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    // 5. คัดกรองข้อมูลเฉพาะ 5 fields ที่โจทย์ต้องการ [cite: 30]
    const result = {
      drone_id: config.drone_id,
      drone_name: config.drone_name,
      light: config.light,
      country: config.country,
      weight: config.weight // [cite: 31-38] (ในโจทย์อาจพิมพ์ 'weigh' แต่ตัวอย่างคือ 'weight')
    };

    // 6. ส่งข้อมูลที่คัดแล้วกลับไป
    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /status/{droneId}
app.get('/status/:droneId', async (req, res) => {
  try {
    // 1. ดึงเลข ID จาก URL
    const { droneId } = req.params; // [cite: 41]

    // 2. ไปดึงข้อมูล "ทั้งหมด" จาก Server 1
    const response = await fetch(process.env.CONFIG_SERVER_URL); // [cite: 42]
    const allConfigs = await response.json();

    // 3. ค้นหาเฉพาะ config ที่ตรงกับ ID
    const config = allConfigs.find(item => item.drone_id == droneId); // [cite: 43]

    // 4. (เผื่อหาไม่เจอ)
    if (!config) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // 5. คัดกรองข้อมูลเฉพาะ 'condition' [cite: 44]
    const result = {
      condition: config.condition // [cite: 49]
    };

    // 6. ส่งข้อมูลที่คัดแล้วกลับไป
    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /logs/{droneId}
app.get('/logs/:droneId', async (req, res) => {
  try {
    // 1. ดึงเลข ID จาก URL
    const { droneId } = req.params; // 

    // 2. สร้าง URL สำหรับกรองข้อมูล (ตามคู่มือ PocketBase)
    const filter = `(drone_id='${droneId}')`;
    const sort = '-created'; // เครื่องหมายลบ (-) หมายถึง Descending (ล่าสุดขึ้นก่อน) 
    const perPage = 12; // 

    // (Encode URL เผื่อมีอักขระพิเศษ)
    const url = `${process.env.LOG_SERVER_URL}?filter=${encodeURIComponent(filter)}&sort=${sort}&perPage=${perPage}`;

    // 3. ไปดึงข้อมูลจาก Server 2 (ต้องใส่ Token!)
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.LOG_API_TOKEN}` // 
      }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch logs from Server 2');
    }

    const logsData = await response.json(); // ข้อมูลจะมาในรูปแบบ { items: [...] }

    // 4. คัดกรองข้อมูลเฉพาะ 5 fields ที่โจทย์ต้องการ 
    const result = logsData.items.map(log => { // ใช้ .map() เพื่อแปลง array
      return {
        drone_id: log.drone_id,
        drone_name: log.drone_name,
        created: log.created,
        country: log.country,
        celsius: log.celsius
        // [cite: 58-72]
      };
    });

    // 5. ส่งข้อมูลที่คัดแล้วกลับไป
    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /logs
app.post('/logs', async (req, res) => {
  try {
    // 1. รับข้อมูลที่ผู้ใช้ส่งมา (Frontend จะส่งมาให้)
    // โจทย์บอกว่าให้เอาแค่ 4 fields นี้ไปสร้างต่อ [cite: 78]
    const { drone_id, drone_name, country, celsius } = req.body;
    
    // 2. เตรียมข้อมูลที่จะส่งไป Server 2
    const dataToCreate = {
      drone_id,
      drone_name,
      country,
      celsius
    };

    // 3. ส่ง POST request ไปที่ Server 2 เพื่อ "สร้าง" ข้อมูล
    const response = await fetch(process.env.LOG_SERVER_URL, {
      method: 'POST', // บอกว่านี่คือการ POST
      headers: {
        'Content-Type': 'application/json', // บอกว่าเรากำลังส่ง JSON
        'Authorization': `Bearer ${process.env.LOG_API_TOKEN}` // ใส่ Token ด้วย
      },
      body: JSON.stringify(dataToCreate) // แปลง Object ของเราเป็น String JSON
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from Server 2:', errorData);
        throw new Error('Failed to create log on Server 2');
    }

    const newLog = await response.json(); // รับข้อมูลที่เพิ่งสร้างเสร็จกลับมา

    // 4. ส่ง "Created" (201) และข้อมูลใหม่กลับไป
    res.status(201).json(newLog);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// --- เดี๋ยวเราจะมาเขียน API routes ตรงนี้ ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});