require('dotenv').config();
const express = require('express');
// (นี่คือ 'node-fetch' เวอร์ชัน 2 ที่เราติดตั้งไป)
const fetch = require('node-fetch');
const app = express();

// ทำให้ Express อ่าน JSON จาก POST request ได้
app.use(express.json());

// --- 1. GET /configs/{droneId} (แก้ไขแล้ว) ---
app.get('/configs/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params;

    // 1. ดึงข้อมูลจาก Server 1
    const response = await fetch(process.env.CONFIG_SERVER_URL);
    const dataString = await response.json(); // Server 1 ส่งข้อมูลมาเป็น String

    // 2. FIX: แปลง String นั้นให้เป็น Array จริงๆ ก่อน
    const allConfigs = JSON.parse(dataString);

    // 3. ค้นหาใน Array ที่แปลงแล้ว
    const config = allConfigs.find(item => item.drone_id == droneId);

    // 4. (เผื่อหาไม่เจอ)
    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    // 5. คัดกรองข้อมูลเฉพาะ 5 fields ที่โจทย์ต้องการ
    const result = {
      drone_id: config.drone_id,
      drone_name: config.drone_name,
      light: config.light,
      country: config.country,
      weight: config.weight
    };

    // 6. ส่งข้อมูลที่คัดแล้วกลับไป
    res.json(result);

  } catch (error) {
    console.error(error); // บรรทัดนี้มีประโยชน์มาก!
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- 2. GET /status/{droneId} (แก้ไขแล้ว) ---
app.get('/status/:droneId', async (req, res) => {
  try {
    // 1. ดึงเลข ID จาก URL
    const { droneId } = req.params;

    // 2. ไปดึงข้อมูล "ทั้งหมด" จาก Server 1
    const response = await fetch(process.env.CONFIG_SERVER_URL);
    const dataString = await response.json(); // Server 1 ส่งข้อมูลมาเป็น String

    // 3. FIX: แปลง String นั้นให้เป็น Array จริงๆ ก่อน
    const allConfigs = JSON.parse(dataString);

    // 4. ค้นหาเฉพาะ config ที่ตรงกับ ID
    const config = allConfigs.find(item => item.drone_id == droneId);

    // 5. (เผื่อหาไม่เจอ)
    if (!config) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // 6. คัดกรองข้อมูลเฉพาะ 'condition'
    const result = {
      condition: config.condition
    };

    // 7. ส่งข้อมูลที่คัดแล้วกลับไป
    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- 3. GET /logs/{droneId} (โค้ดเดิม - ไม่ต้องแก้) ---
app.get('/logs/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params;

    const filter = `(drone_id='${droneId}')`;
    const sort = '-created';
    const perPage = 12;

    const url = `${process.env.LOG_SERVER_URL}?filter=${encodeURIComponent(filter)}&sort=${sort}&perPage=${perPage}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.LOG_API_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch logs from Server 2');
    }

    const logsData = await response.json(); // Server 2 ทำงานถูกต้อง

    const result = logsData.items.map(log => {
      return {
        drone_id: log.drone_id,
        drone_name: log.drone_name,
        created: log.created,
        country: log.country,
        celsius: log.celsius
      };
    });

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- 4. POST /logs (โค้ดเดิม - ไม่ต้องแก้) ---
app.post('/logs', async (req, res) => {
  try {
    const { drone_id, drone_name, country, celsius } = req.body;

    const dataToCreate = {
      drone_id,
      drone_name,
      country,
      celsius
    };

    const response = await fetch(process.env.LOG_SERVER_URL, {
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
    res.status(201).json(newLog);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- ส่วนเริ่มต้นเซิร์ฟเวอร์ (โค้ดเดิม) ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});