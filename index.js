require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // ถูกต้องแล้ว
const app = express();

app.use(express.json());

// --- 1. GET /configs/{droneId} (แก้ไข .find) ---
app.get('/configs/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params; // นี่คือ String (เช่น "3002")

    // 1. ดึงข้อมูล (ถูกต้อง)
    const response = await fetch(process.env.CONFIG_SERVER_URL);
    const responseData = await response.json(); 

    // 2. ดึง "หัวตาราง" (ถูกต้อง)
    let headers = responseData.headers;
    if (!headers || headers.length === 0) {
      if (responseData.data && responseData.data.length > 0) {
        headers = responseData.data[0];
      } else {
        throw new Error('Server 1 returned no headers and no data');
      }
    }
    
    // 3. ทำความสะอาด "หัวตาราง" (ถูกต้อง)
    const cleanedHeaders = headers.map(h => h.trim());
    
    // 4. ดึง rows (ถูกต้อง)
    const valueRows = responseData.data.slice(1);

    // 5. แปลงร่าง (ถูกต้อง)
    const allConfigs = valueRows.map(row => {
      const configObject = {};
      cleanedHeaders.forEach((header, index) => {
        configObject[header] = row[index];
      });
      return configObject;
    });

    // 6. FIX: ค้นหาแบบ "สะอาด"
    // (เช็ก null -> แปลงเป็น String -> ตัดช่องว่าง -> เทียบ String)
    const config = allConfigs.find(item => 
      item.drone_id != null && item.drone_id.toString().trim() === droneId
    );

    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    // 7. คัดกรองข้อมูล
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

// --- 2. GET /status/{droneId} (แก้ไข .find) ---
app.get('/status/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params; 

    // 1. ดึงข้อมูล (ถูกต้อง)
    const response = await fetch(process.env.CONFIG_SERVER_URL);
    const responseData = await response.json();

    // 2. ดึง "หัวตาราง" (ถูกต้อง)
    let headers = responseData.headers;
    if (!headers || headers.length === 0) {
      if (responseData.data && responseData.data.length > 0) {
        headers = responseData.data[0];
      } else {
        throw new Error('Server 1 returned no headers and no data');
      }
    }
    
    // 3. ทำความสะอาด "หัวตาราง" (ถูกต้อง)
    const cleanedHeaders = headers.map(h => h.trim());
    
    // 4. ดึง rows (ถูกต้อง)
    const valueRows = responseData.data.slice(1);

    // 5. แปลงร่าง (ถูกต้อง)
    const allConfigs = valueRows.map(row => {
      const configObject = {};
      cleanedHeaders.forEach((header, index) => {
        configObject[header] = row[index];
      });
      return configObject;
    });

    // 6. FIX: ค้นหาแบบ "สะอาด"
    const config = allConfigs.find(item => 
      item.drone_id != null && item.drone_id.toString().trim() === droneId
    );

    if (!config) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // 7. คัดกรองข้อมูล
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

    // (ข้อมูล Server 2 สะอาดดี เราไม่ต้องแก้)
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