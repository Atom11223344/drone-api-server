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
    
    const cleanedHeaders = headers.map(h => h.trim());
    
    // 3b. ดึง "ข้อมูล" (ตัดแถวหัวตารางที่ซ้ำซ้อนทิ้ง)
    const valueRows = configsArray.slice(1); 

    // 3c. แปลงร่าง
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
    throw error;
  }
}

// --- 1. GET /configs/{droneId} ---
app.get('/configs/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params; // นี่คือ String (เช่น "3002")

    // 1. ดึงข้อมูลที่ "สะอาด" แล้ว
    const allConfigs = await getConfigsFromServer1();

    // 2. ตรรกะ "ค้นหา" ที่แม่นยำ
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
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- 2. GET /status/{droneId} ---
app.get('/status/:droneId', async (req, res) => {
  try {
    const { droneId } = req.params; 

    // 1. ดึงข้อมูลที่ "สะอาด" แล้ว
    const allConfigs = await getConfigsFromServer1();

    // 2. ตรรกะ "ค้นหา" ที่แม่นยำ
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
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- 3. GET /logs/{droneId} ---
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

// --- 4. POST /logs ---
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

// --- ส่วนเริ่มต้นเซิร์ฟเวอร์ ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});