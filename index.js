require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch@2');
const app = express();

app.use(express.json());

// --- 1. GET /configs/{droneId} (แก้ไขตรรกะแปลงข้อมูล) ---
app.get('/configs/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params;

    // 1. ดึงข้อมูลจาก Server 1
    const response = await fetch(process.env.CONFIG_SERVER_URL);
    const responseData = await response.json(); // ได้ {"data": [[...]]}

    // 2. ล้วงเอา Array ของ Array ออกมา
    const dataArray = responseData.data;

    // 3. FIX: แปลง Array ของ Array ให้เป็น Array ของ Object
    const headers = dataArray[0]; // ["drone_id", "drone_name", ...]
    const valueRows = dataArray.slice(1); // เอาเฉพาะแถวข้อมูล

    const allConfigs = valueRows.map(row => {
      const configObject = {};
      headers.forEach((header, index) => {
        configObject[header] = row[index];
      });
      return configObject;
    });
    // ตอนนี้ allConfigs คือ [{drone_id: 3001, ...}, {drone_id: 3002, ...}]

    // 4. ค้นหาใน Array ที่แปลงร่างแล้ว
    const config = allConfigs.find(item => item.drone_id == droneId);

    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    // 5. คัดกรองข้อมูล
    const result = {
      drone_id: config.drone_id,
      drone_name: config.drone_name,
      light: config.light,
      country: config.country,
      weight: config.weight
    };

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- 2. GET /status/{droneId} (แก้ไขตรรกะแปลงข้อมูล) ---
app.get('/status/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params;

    // 1. ดึงข้อมูลจาก Server 1
    const response = await fetch(process.env.CONFIG_SERVER_URL);
    const responseData = await response.json(); // ได้ {"data": [[...]]}

    // 2. ล้วงเอา Array ของ Array ออกมา
    const dataArray = responseData.data;

    // 3. FIX: แปลง Array ของ Array ให้เป็น Array ของ Object
    const headers = dataArray[0]; // ["drone_id", "drone_name", ...]
    const valueRows = dataArray.slice(1); // เอาเฉพาะแถวข้อมูล

    const allConfigs = valueRows.map(row => {
      const configObject = {};
      headers.forEach((header, index) => {
        configObject[header] = row[index];
      });
      return configObject;
    });
    // ตอนนี้ allConfigs คือ [{drone_id: 3001, ...}, {drone_id: 3002, ...}]

    // 4. ค้นหาใน Array ที่แปลงร่างแล้ว
    const config = allConfigs.find(item => item.drone_id == droneId);

    if (!config) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // 5. คัดกรองข้อมูล
    const result = {
      condition: config.condition
    };

    res.json(result);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- 3. GET /logs/{droneId} (โค้ดเดิม - ถูกต้องแล้ว) ---
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

    const logsData = await response.json();

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

// --- 4. POST /logs (โค้ดเดิม - ถูกต้องแล้ว) ---
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