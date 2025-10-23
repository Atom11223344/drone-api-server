require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

// --- 1. Endpoint ทดสอบว่า Express ทำงาน ---
app.get('/test', (req, res) => {
  console.log('GET /test was called!');
  res.status(200).json({ 
    message: "Success! Vercel and Express are working." 
  });
});

// --- 2. Endpoint ทดสอบว่า 'fetch' และ 'Env Var' ทำงาน ---
// (เราจะลองดึง Log จาก Server 2 ที่ข้อมูลสะอาด)
app.get('/test-logs', async (req, res) => {
  try {
    console.log('GET /test-logs was called!');
    
    // ลองดึง Log แค่ 1 อัน
    const url = `${process.env.LOG_SERVER_URL}?perPage=1`;
    const token = process.env.LOG_API_TOKEN;

    if (!url || !token) {
      throw new Error('LOG_SERVER_URL or LOG_API_TOKEN is not set in Vercel');
    }

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Server 2 returned an error: ${response.status}`);
    }

    const data = await response.json();
    
    res.status(200).json({ 
      message: "Success! Fetch to Server 2 is working.",
      data: data 
    });

  } catch (error) {
    console.error('Error in /test-logs:', error.message);
    res.status(500).json({ 
      error: 'Test failed', 
      message: error.message 
    });
  }
});


// --- ส่วนเริ่มต้นเซิร์ฟเวอร์ ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});