import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Weather
  app.get("/api/weather", async (req, res) => {
    const { lat, lon, city } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey || apiKey === "MY_OPENWEATHER_API_KEY") {
      return res.status(401).json({ 
        error: "OpenWeather API key is missing or not configured. Please add 'OPENWEATHER_API_KEY' to the Secrets panel in AI Studio settings." 
      });
    }

    try {
      let url = "";
      if (city) {
        url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
      } else if (lat && lon) {
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      } else {
        return res.status(400).json({ error: "Missing location parameters" });
      }

      const response = await axios.get(url);
      
      // Also fetch forecast
      const forecastUrl = city 
        ? `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`
        : `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      
      const forecastResponse = await axios.get(forecastUrl);

      res.json({
        current: response.data,
        forecast: forecastResponse.data
      });
    } catch (error: any) {
      console.error("Weather API Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ 
        error: error.response?.data?.message || "Failed to fetch weather data" 
      });
    }
  });

  // API Route for Geocoding (City Search Suggestions)
  app.get("/api/geosearch", async (req, res) => {
    const { q } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!q || !apiKey || apiKey === "MY_OPENWEATHER_API_KEY") {
      return res.status(400).json({ error: "Missing parameters" });
    }

    try {
      const url = `https://api.openweathermap.org/geo/1.0/direct?q=${q}&limit=5&appid=${apiKey}`;
      const response = await axios.get(url);
      res.json(response.data);
    } catch (error: any) {
      console.error("Geocoding API Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json({ 
        error: error.response?.data?.message || "Failed to search cities" 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
