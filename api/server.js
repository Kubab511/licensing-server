const express = require('express');
const crypto = require('crypto');
const jsonfile = require('jsonfile');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const PORT = 8080;

const app = express();

const corsOptions = {
  origin: '*', // Allow all origins (or specify frontend URL)
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, Authorization',
};

app.use(express.json());
app.use(cors(corsOptions));

const usersFilePath = path.join(__dirname, 'users.json');
const keyPath = path.join(__dirname, 'key.pem')
const key = fs.readFileSync(keyPath, 'utf8');


const loadUsers = async () => {
  try {
    const data = await jsonfile.readFile(usersFilePath);
    return data.users;
  } catch (error) {
    console.error('Error reading users.json:', error);
    throw error;
  }
};


app.post('/v1/checkSerial', async (req, res) => {
  const { deviceID, serial } = req.body;

  const users = await loadUsers();
  const user = users.find((user) => user.deviceID === deviceID && user.serial === serial);

  if (!user) {
    return res.status(401).send("");
  }

  var date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(23, 59, 59, 999);
  date = date.toISOString();
  
  let data = {
    deviceID: deviceID,
    expirationDate: date
  };
  data = JSON.stringify(data);

  const sign = crypto.createSign('sha256');
  sign.update(data);
  sign.end();
  const signature = sign.sign(key, 'base64');

  res.json({
    data: {
      deviceID: deviceID,
      expirationDate: date
    },
    signature: signature
  });
});

app.get('/v1/weather', async (req, res) => {
  const { lat = 53.35, lon = -6.27, lang = 'en', units = 'metric' } = req.query;
  const apiKey = process.env.WEATHER_API_KEY;
  const requestUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${units}&lang=${lang}&appid=${apiKey}`;

  try {
    const response = await fetch(requestUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Error fetching weather data' });
    }
    const weatherData = await response.json();
    res.json(weatherData);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/auth', (req, res) => {
  res.statusCode(200);
});

// module.exports = app;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});