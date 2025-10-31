require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

app.use(express.json());

// --- Helper Function: จัดการข้อมูล Server 1  ---
async function getConfigsFromServer1() {
  try {
    // 1. ดึงข้อมูล
    
    const response = await fetch(process.env.CONFIG_SERVER_URL);
    if (!response.ok) {
      throw new Error(`Server 1 HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json(); 
    
    // 2. ตรวจสอบว่า "data" (ที่เป็น Array of Objects) มีอยู่จริง
    if (responseData.data && Array.isArray(responseData.data)) {
      // 3. "ส่ง" มันกลับไปเลย
      return responseData.data;
    } else {
      throw new Error('Server 1 response does not contain a "data" array.');
    }

  } catch (error) {
    console.error('Error in getConfigsFromServer1:', error);
    throw error;
  }
}

// --- 1. GET /configs/{droneId} ---
app.get('/configs/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params; 

    // 1. ดึงข้อมูล
    const allConfigs = await getConfigsFromServer1();

    // 2. ค้นหา
    const searchId = parseInt(droneId, 10);
    const config = allConfigs.find(item => {
      const itemId = parseInt(item.drone_id, 10); 
      return itemId === searchId;
    });

    if (!config) {
      return res.status(404).json({ error: 'Config not found' });
    }

    // 3. คัดกรองข้อมูล
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

// --- 2. GET /status/{droneId} ---
app.get('/status/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params; 

    // 1. ดึงข้อมูล
    const allConfigs = await getConfigsFromServer1();

    // 2. ค้นหา
    const searchId = parseInt(droneId, 10);
    const config = allConfigs.find(item => {
      const itemId = parseInt(item.drone_id, 10);
      return itemId === searchId;
    });

    if (!config) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // 3. คัดกรองข้อมูล
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

// --- 3. GET /logs/{droneId}  ---
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

// --- 4. POST /logs  ---
app.post('/logs', async (req, res) => {
  try {
    const { drone_id, drone_name, country, celsius } = req.body;
    const dataToCreate = { drone_id, drone_name, country, celsius };

    
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

// --- ส่วนเริ่มต้นเซิร์ฟเวอร์  ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});