import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Wind, 
  Droplets, 
  Cloud, 
  Thermometer, 
  RefreshCw, 
  Mic, 
  Sun, 
  Moon,
  CloudRain,
  Navigation,
  Globe,
  X,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { WeatherData, PredictionResult, GeocodeResult } from './types';
import { predictRain } from './lib/prediction';
import { RainAnimation, SunAnimation, CloudAnimation } from './components/WeatherAnimations';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function App() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [city, setCity] = useState('');
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isListening, setIsListening] = useState(false);
  const [isDetailedModalOpen, setIsDetailedModalOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const glassClass = theme === 'dark' ? 'glass-dark' : 'glass-light';
  const textClass = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const subTextClass = theme === 'dark' ? 'text-white/60' : 'text-slate-600';
  const borderClass = theme === 'dark' ? 'border-white/10' : 'border-slate-200';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Load settings from Firebase
        try {
          const settingsDoc = await getDoc(doc(db, 'userSettings', u.uid));
          if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            if (data.unit) setUnits(data.unit);
            if (data.theme) setTheme(data.theme);
          } else {
            // Initialize default settings
            await setDoc(doc(db, 'userSettings', u.uid), {
              uid: u.uid,
              unit: 'metric',
              theme: 'dark',
              updatedAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error("Failed to load user settings", e);
        }
      }
      
      // Always fetch weather, even for guest users
      fetchWeatherByCoords();
      setIsAuthReady(true);
    });

    // Load history from localStorage
    const savedHistory = localStorage.getItem('weather_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const addToHistory = (newCity: string) => {
    const formattedCity = newCity.trim().toLowerCase();
    if (!formattedCity) return;

    setHistory(prev => {
      const filtered = prev.filter(c => c.toLowerCase() !== formattedCity);
      const updated = [newCity.trim(), ...filtered].slice(0, 5);
      localStorage.setItem('weather_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('weather_history');
  };

  const toggleUnits = async () => {
    const newUnits = units === 'metric' ? 'imperial' : 'metric';
    setUnits(newUnits);
    
    if (user) {
      try {
        await setDoc(doc(db, 'userSettings', user.uid), {
          unit: newUnits,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.error("Failed to save unit preference", e);
      }
    }

    // Refetch weather with new units
    if (weather) {
      fetchWeather(weather.current.name);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    if (user) {
      try {
        await setDoc(doc(db, 'userSettings', user.uid), {
          theme: newTheme,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.error("Failed to save theme preference", e);
      }
    }
  };

  const fetchWeather = async (searchCity?: string, lat?: number, lon?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { units };
      if (searchCity) {
        params.city = searchCity;
      } else if (lat && lon) {
        params.lat = lat;
        params.lon = lon;
      }

      const response = await axios.get('/api/weather', { params });
      setWeather(response.data);
      setPrediction(predictRain(response.data.current));
      
      if (searchCity) {
        addToHistory(searchCity);
      } else if (response.data.current.name) {
        addToHistory(response.data.current.name);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to fetch weather data. Check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByCoords = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(undefined, pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather('London') // Global fallback
      );
    } else {
      fetchWeather('London');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (city.trim()) fetchWeather(city);
  };

  const logout = () => {
    auth.signOut();
  };

  const startVoiceAssistant = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Voice recognition is not supported in this browser. Please try using Chrome or Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError("Microphone access denied. Please check your browser permissions.");
        } else {
          setError(`Voice recognition error: ${event.error}`);
        }
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log("Transcript:", transcript);
        
        if (transcript.includes('rain')) {
          speak(prediction?.message || "I'm not sure about the rain yet.");
        } else if (transcript.includes('weather')) {
          speak(`The weather in ${weather?.current.name} is ${weather?.current.weather[0].description} with a temperature of ${weather?.current.main.temp} degrees.`);
        } else {
          speak("I heard you say " + transcript + ". Try asking about the rain or the weather.");
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition", err);
      setError("Failed to start voice assistant. Please try again.");
      setIsListening(false);
    }
  };

  const searchCities = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await axios.get(`/api/geosearch?q=${query}`);
      setSuggestions(response.data);
    } catch (err) {
      console.error("Failed to fetch suggestions", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (city.length >= 3) {
        searchCities(city);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [city]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const getBgGradient = () => {
    if (!weather) return theme === 'dark' ? 'from-slate-900 to-slate-800' : 'from-slate-50 to-slate-200';
    const condition = weather.current.weather[0].main.toLowerCase();
    
    if (theme === 'dark') {
      if (condition.includes('rain')) return 'from-blue-900 via-slate-900 to-slate-800';
      if (condition.includes('clear')) return 'from-orange-600 via-amber-900 to-slate-900';
      return 'from-slate-700 via-slate-800 to-slate-900';
    } else {
      if (condition.includes('rain')) return 'from-blue-100 via-blue-200 to-slate-100';
      if (condition.includes('clear')) return 'from-orange-100 via-amber-50 to-slate-50';
      return 'from-slate-100 via-slate-200 to-slate-300';
    }
  };

  const forecastData = weather?.forecast.list.slice(0, 8).map(item => ({
    time: format(new Date(item.dt * 1000), 'HH:mm'),
    temp: Math.round(item.main.temp),
    rain: Math.round((item.pop || 0) * 100)
  })) || [];

  if (!isAuthReady) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${theme === 'dark' ? 'from-slate-900 to-blue-900' : 'from-blue-50 to-indigo-50'}`}>
        <RefreshCw className={`w-12 h-12 ${theme === 'dark' ? 'text-white' : 'text-slate-900'} animate-spin`} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-1000 bg-gradient-to-br ${getBgGradient()} p-4 sm:p-6 md:p-8 flex flex-col items-center overflow-x-hidden ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
      {/* Animations */}
      <AnimatePresence>
        {weather?.current.weather[0].main.toLowerCase().includes('rain') && <RainAnimation key="rain" />}
        {weather?.current.weather[0].main.toLowerCase().includes('clear') && <SunAnimation key="sun" />}
        {weather?.current.weather[0].main.toLowerCase().includes('cloud') && <CloudAnimation key="cloud" />}
      </AnimatePresence>

      <div className="w-full max-w-6xl flex flex-col items-center">
        {/* Header & Search */}
        <header className="w-full flex flex-col md:flex-row justify-between items-center gap-6 mb-8 md:mb-12 z-40">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className={`p-3 ${theme === 'dark' ? 'glass-dark' : 'glass-light'} rounded-2xl shadow-lg`}>
              <CloudRain className={`${theme === 'dark' ? 'text-white' : 'text-slate-800'} w-7 h-7`} />
            </div>
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'} tracking-tight`}>GODY SkyPredict</h1>
          </motion.div>

          <div className="relative w-full md:w-[450px] z-30 flex flex-col items-center">
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-3 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/10"
            >
              <Globe className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.15em]">Global Coverage Active</span>
            </motion.div>
            <motion.form 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSearch} 
              className="relative w-full"
            >
              <input
                type="text"
                value={city}
                onChange={(e) => {
                  const value = e.target.value;
                  setCity(value);
                  if (value.length > 0) {
                    setShowSuggestions(true);
                    setShowHistory(false);
                  } else {
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setShowHistory(true);
                  }
                }}
                onFocus={() => {
                  if (city.length > 0) setShowSuggestions(true);
                  else setShowHistory(true);
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowSuggestions(false);
                    setShowHistory(false);
                  }, 200);
                }}
                placeholder="Search any city or town..."
                className={`w-full ${theme === 'dark' ? 'glass-dark' : 'glass-light'} py-4 px-14 rounded-3xl ${theme === 'dark' ? 'text-white placeholder-white/50' : 'text-slate-900 placeholder-slate-500'} focus:outline-none focus:ring-2 ring-white/30 transition-all shadow-lg text-lg`}
              />
              <Search className={`absolute left-5 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'} w-5 h-5`} />
              <button type="submit" className="hidden">Search</button>
            </motion.form>

            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`absolute top-full left-0 right-0 mt-2 ${theme === 'dark' ? 'glass-dark' : 'glass-light'} rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 z-50`}
                >
                  <div className={`p-4 border-b ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50/50'}`}>
                    <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'} uppercase tracking-widest`}>Global Search</span>
                  </div>
                  <div className="py-2">
                    {suggestions.map((item, index) => (
                      <button
                        key={`${item.name}-${index}`}
                        onClick={() => {
                          const fullName = `${item.name}${item.state ? `, ${item.state}` : ''}, ${item.country}`;
                          setCity(fullName);
                          fetchWeather(fullName, item.lat, item.lon);
                          setShowSuggestions(false);
                        }}
                        className={`w-full px-6 py-3 text-left ${theme === 'dark' ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'} flex items-center gap-3 transition-all group`}
                      >
                        <MapPin className={`w-4 h-4 ${theme === 'dark' ? 'text-white/20' : 'text-slate-300'} group-hover:text-blue-400 transition-colors`} />
                        <div className="flex flex-col">
                          <span className="font-medium">{item.name}</span>
                          <span className={`text-[10px] ${subTextClass} uppercase`}>
                            {item.state ? `${item.state}, ` : ''}{item.country}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {showHistory && history.length > 0 && !showSuggestions && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`absolute top-full left-0 right-0 mt-2 ${theme === 'dark' ? 'glass-dark' : 'glass-light'} rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 z-50`}
                >
                  <div className={`p-4 border-b ${theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50/50'} flex justify-between items-center`}>
                    <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'} uppercase tracking-widest`}>Recent Searches</span>
                    <button 
                      onClick={clearHistory}
                      className={`text-[10px] font-bold ${theme === 'dark' ? 'text-white/30 hover:text-white/80' : 'text-slate-400 hover:text-slate-600'} uppercase tracking-widest transition-colors`}
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="py-2">
                    {history.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setCity(item);
                          fetchWeather(item);
                          setShowHistory(false);
                        }}
                        className={`w-full px-6 py-3 text-left ${theme === 'dark' ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'} flex items-center gap-3 transition-all group`}
                      >
                        <RefreshCw className={`w-4 h-4 ${theme === 'dark' ? 'text-white/20' : 'text-slate-300'} group-hover:rotate-180 transition-transform duration-500`} />
                        <span className="font-medium">{item}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <button 
              onClick={toggleTheme}
              className={`${theme === 'dark' ? 'glass-dark' : 'glass-light'} p-3 rounded-2xl text-white hover:scale-110 transition-all shadow-md`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
            {user && (
              <div className={`flex items-center gap-3 ${theme === 'dark' ? 'glass-dark' : 'glass-light'} p-1.5 pr-5 rounded-full shadow-md group relative`}>
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}&background=random`} alt="" className="w-9 h-9 rounded-full border border-white/20" />
                <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{user.displayName?.split(' ')[0] || user.email?.split('@')[0]}</span>
                
                <button 
                  onClick={logout}
                  className="absolute top-full right-0 mt-2 bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg"
                >
                  Logout
                </button>
              </div>
            )}
          </motion.div>
        </header>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-8 right-8 bg-red-500/80 border border-red-500/50 text-white p-5 rounded-2xl max-w-xs backdrop-blur-xl z-[100] shadow-2xl flex items-start gap-4"
            >
              <div className="p-2 bg-white/20 rounded-xl shrink-0">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 pr-6">
                <p className="font-bold text-sm mb-1 uppercase tracking-wider">Error</p>
                <p className="text-sm text-white/90 leading-relaxed">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {!weather && !loading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center z-20"
          >
            <div className={`w-32 h-32 ${glassClass} rounded-full flex items-center justify-center mb-8 shadow-2xl`}>
              <Globe className={`w-16 h-16 ${theme === 'dark' ? 'text-white/80' : 'text-blue-500'} animate-pulse`} />
            </div>
            <h2 className={`text-4xl md:text-5xl font-bold ${textClass} mb-4 tracking-tight`}>World-Class Weather Insights</h2>
            <p className={`${subTextClass} text-lg max-w-md`}>
              Access real-time meteorological data and AI-powered sky predictions for any city on Earth.
            </p>
            <button 
              onClick={fetchWeatherByCoords}
              className={`mt-10 flex items-center gap-3 ${theme === 'dark' ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'} px-8 py-4 rounded-3xl font-bold hover:opacity-90 transition-all shadow-xl hover:scale-105 active:scale-95`}
            >
              <Navigation className="w-5 h-5" />
              Use My Location
            </button>
          </motion.div>
        )}

        {weather && !loading && (
          <main className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 z-20">
            {/* Main Weather Card */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className={`md:col-span-2 ${glassClass} rounded-[3rem] p-8 sm:p-10 md:p-14 flex flex-col sm:flex-row justify-between items-center gap-10 shadow-2xl relative overflow-hidden group`}
            >
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              
              <div className="text-center sm:text-left relative z-10">
                <div className={`flex items-center justify-center sm:justify-start gap-2 ${subTextClass} mb-4`}>
                  <MapPin className="w-5 h-5" />
                  <span className="text-xl font-semibold tracking-wide">{weather.current.name}, {weather.current.sys.country}</span>
                </div>
                <h2 className={`text-[7rem] sm:text-[9rem] md:text-[11rem] font-bold ${textClass} leading-none mb-6 drop-shadow-lg`}>
                  {Math.round(weather.current.main.temp)}°
                </h2>
                <div className="flex items-center justify-center sm:justify-start gap-4">
                  <p className={`text-2xl sm:text-3xl ${theme === 'dark' ? 'text-white/90' : 'text-slate-800'} capitalize font-semibold tracking-tight`}>
                    {weather.current.weather[0].description}
                  </p>
                  <div className={`h-2 w-2 rounded-full ${theme === 'dark' ? 'bg-white/40' : 'bg-slate-300'}`} />
                  <p className={`text-xl ${subTextClass} font-medium`}>
                    Feels like {Math.round(weather.current.main.feels_like)}°
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-8 relative z-10">
                <motion.img 
                  initial={{ scale: 0.8, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 100 }}
                  src={`https://openweathermap.org/img/wn/${weather.current.weather[0].icon}@4x.png`} 
                  alt="weather icon"
                  className={`w-48 h-48 sm:w-56 sm:h-56 ${theme === 'dark' ? 'drop-shadow-[0_20px_50px_rgba(255,255,255,0.3)]' : 'drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)]'}`}
                />
                <div className="flex gap-4">
                  <button 
                    onClick={toggleUnits}
                    className={`${glassClass} px-4 py-2 rounded-xl ${textClass} text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-all shadow-md flex items-center gap-2`}
                  >
                    <Thermometer className="w-4 h-4" />
                    {units === 'metric' ? '°C' : '°F'}
                  </button>
                  <button onClick={fetchWeatherByCoords} title="My Location" className={`p-5 ${glassClass} rounded-[1.5rem] hover:bg-white/30 transition-all shadow-lg hover:scale-110 active:scale-90 group`}>
                    <Navigation className={`${textClass} w-7 h-7 group-hover:rotate-12 transition-transform`} />
                  </button>
                  <button onClick={() => fetchWeather(weather.current.name)} title="Refresh" className={`p-5 ${glassClass} rounded-[1.5rem] hover:bg-white/30 transition-all shadow-lg hover:scale-110 active:scale-90 group`}>
                    <RefreshCw className={`${textClass} w-7 h-7 group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                  <button 
                    onClick={startVoiceAssistant} 
                    title="Voice Assistant"
                    className={`p-5 ${glassClass} rounded-[1.5rem] hover:bg-white/30 transition-all shadow-lg hover:scale-110 active:scale-90 group relative ${isListening ? 'bg-red-500/40 ring-4 ring-red-500/30' : ''}`}
                  >
                    <Mic className={`${textClass} w-7 h-7`} />
                    {isListening && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* AI Prediction Card */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={`${glassClass} rounded-[3rem] p-10 flex flex-col justify-center items-center text-center shadow-2xl border-white/20`}
            >
              <div className="relative w-48 h-48 mb-8">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-xl">
                  <circle
                    cx="96"
                    cy="96"
                    r="84"
                    stroke="currentColor"
                    strokeWidth="14"
                    fill="transparent"
                    className={`${theme === 'dark' ? 'text-white/10' : 'text-slate-200'}`}
                  />
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="84"
                    stroke="currentColor"
                    strokeWidth="14"
                    fill="transparent"
                    strokeDasharray={528}
                    initial={{ strokeDashoffset: 528 }}
                    animate={{ strokeDashoffset: 528 - (528 * (prediction?.probability || 0)) / 100 }}
                    transition={{ duration: 2, ease: "circOut" }}
                    className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-5xl font-bold ${textClass} tracking-tighter`}>{prediction?.probability}%</span>
                  <span className={`text-xs ${subTextClass} uppercase font-bold tracking-[0.2em] mt-1`}>Rain Chance</span>
                </div>
              </div>
              <div className={`${theme === 'dark' ? 'bg-white/10' : 'bg-slate-900/10'} px-4 py-1.5 rounded-full mb-4`}>
                <span className={`text-xs font-bold ${textClass} uppercase tracking-widest`}>AI Analysis</span>
              </div>
              <h3 className={`${textClass} font-bold text-2xl mb-4 tracking-tight`}>Sky Prediction</h3>
              <p className={`${subTextClass} leading-relaxed text-lg font-medium`}>
                {prediction?.message}
              </p>
              <div className={`mt-6 pt-6 border-t ${borderClass} w-full`}>
                <p className={`${theme === 'dark' ? 'text-white/40' : 'text-slate-400'} text-[10px] uppercase font-bold tracking-widest`}>
                  Current Unit: {units === 'metric' ? 'Celsius' : 'Fahrenheit'}
                </p>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="md:col-span-2 lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {[
                { label: 'Humidity', value: `${weather.current.main.humidity}%`, icon: Droplets, color: 'text-blue-300' },
                { label: 'Wind Speed', value: `${weather.current.wind.speed} m/s`, icon: Wind, color: 'text-emerald-300' },
                { label: 'Pressure', value: `${weather.current.main.pressure} hPa`, icon: Thermometer, color: 'text-orange-300' },
                { label: 'Cloudiness', value: `${weather.current.clouds.all}%`, icon: Cloud, color: 'text-slate-300' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className={`${glassClass} rounded-[2rem] p-8 flex flex-col items-center gap-4 shadow-xl hover:bg-white/25 transition-colors group`}
                >
                  <div className={`p-4 rounded-2xl ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-900/5'} group-hover:scale-110 transition-transform ${stat.color}`}>
                    <stat.icon className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <span className={`block ${subTextClass} text-xs font-bold uppercase tracking-widest mb-1`}>{stat.label}</span>
                    <span className={`text-2xl font-bold tracking-tight ${textClass}`}>{stat.value}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Forecast Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className={`md:col-span-2 lg:col-span-3 ${glassClass} rounded-[3rem] p-10 shadow-2xl`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
                <div>
                  <h3 className={`font-bold text-2xl tracking-tight ${textClass}`}>24-Hour Forecast</h3>
                  <p className={`${subTextClass} text-sm font-medium`}>Temperature and rain probability trends</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-white' : 'bg-slate-900'}`} />
                      <span className={`${subTextClass} text-xs font-bold uppercase`}>Temp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${theme === 'dark' ? 'bg-white/30' : 'bg-slate-900/30'}`} />
                      <span className={`${subTextClass} text-xs font-bold uppercase`}>Rain %</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDetailedModalOpen(true)}
                    className={`${glassClass} px-6 py-2.5 rounded-2xl ${textClass} text-xs font-bold uppercase tracking-widest hover:bg-white/20 transition-all shadow-md`}
                  >
                    View Detailed Forecast
                  </button>
                </div>
              </div>
              
              <div className="h-72 w-full cursor-pointer" onClick={() => setIsDetailedModalOpen(true)}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme === 'dark' ? '#fff' : '#0f172a'} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={theme === 'dark' ? '#fff' : '#0f172a'} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.2)'} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={theme === 'dark' ? 'rgba(255,255,255,0)' : 'rgba(15,23,42,0)'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)'} vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      stroke={theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(15,23,42,0.4)'} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)', 
                        backdropFilter: 'blur(16px)', 
                        border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'}`, 
                        borderRadius: '20px', 
                        padding: '12px 16px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                      }}
                      itemStyle={{ color: theme === 'dark' ? '#fff' : '#0f172a', fontSize: '14px', fontWeight: '600' }}
                      labelStyle={{ color: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)', marginBottom: '4px', fontSize: '12px', fontWeight: '700' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="rain" 
                      stroke={theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.2)'} 
                      fillOpacity={1} 
                      fill="url(#colorRain)" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="temp" 
                      stroke={theme === 'dark' ? '#fff' : '#0f172a'} 
                      fillOpacity={1} 
                      fill="url(#colorTemp)" 
                      strokeWidth={4}
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </main>
        )}

        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-[60vh] gap-6 z-20"
          >
            <div className="relative">
              <RefreshCw className={`w-16 h-16 ${textClass} animate-spin`} />
              <div className={`absolute inset-0 w-16 h-16 border-4 ${theme === 'dark' ? 'border-white/20' : 'border-slate-900/10'} rounded-full`} />
            </div>
            <p className={`${textClass} text-xl font-bold tracking-widest animate-pulse uppercase`}>Predicting the sky...</p>
          </motion.div>
        )}
      </div>

      <footer className={`mt-auto py-10 ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'} text-[10px] font-bold uppercase tracking-[0.3em] z-20 flex flex-col items-center gap-4`}>
        <div className="flex items-center gap-6">
          <span>Global Weather Intelligence</span>
          <div className="w-1 h-1 rounded-full bg-current opacity-20" />
          <span>Universal Coverage</span>
        </div>
        <div className="flex flex-col items-center gap-2 opacity-50">
          <span>© 2026 GODY SkyPredict • Powered by G-TECHNOLOGIES</span>
        </div>
      </footer>

      {/* Detailed Forecast Modal */}
      <AnimatePresence>
        {isDetailedModalOpen && weather && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailedModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-4xl ${theme === 'dark' ? 'glass-dark' : 'glass-light'} rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border ${borderClass}`}
            >
              <div className={`p-8 sm:p-10 border-b ${borderClass} flex justify-between items-center ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'}`}>
                <div>
                  <h2 className={`text-3xl font-bold ${textClass} tracking-tight`}>Detailed Forecast</h2>
                  <p className={`${subTextClass} font-medium`}>{weather.current.name}, {weather.current.sys.country}</p>
                </div>
                <button 
                  onClick={() => setIsDetailedModalOpen(false)}
                  className={`p-4 ${glassClass} rounded-2xl hover:bg-white/20 transition-all`}
                >
                  <X className={`w-6 h-6 ${textClass}`} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-12 custom-scrollbar">
                {/* Hourly Section */}
                <section>
                  <h3 className={`${subTextClass} text-xs font-bold uppercase tracking-[0.2em] mb-6`}>Hourly Trends (Next 24h)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-4">
                    {weather.forecast.list.slice(0, 8).map((item, i) => (
                      <div key={i} className={`${glassClass} p-4 rounded-2xl flex flex-col items-center gap-2 text-center`}>
                        <span className={`${subTextClass} text-xs font-bold`}>{format(new Date(item.dt * 1000), 'HH:mm')}</span>
                        <img 
                          src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`} 
                          alt="icon" 
                          className="w-10 h-10"
                        />
                        <span className={`${textClass} font-bold text-lg`}>{Math.round(item.main.temp)}°</span>
                        <div className="flex items-center gap-1 text-[10px] text-blue-400 font-bold">
                          <Droplets className="w-3 h-3" />
                          {Math.round((item.pop || 0) * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Daily Section */}
                <section>
                  <h3 className={`${subTextClass} text-xs font-bold uppercase tracking-[0.2em] mb-6`}>Daily Outlook (5 Days)</h3>
                  <div className="space-y-3">
                    {weather.forecast.list.filter((_, i) => i % 8 === 0).map((item, i) => (
                      <div key={i} className={`${glassClass} p-6 rounded-[2rem] flex items-center justify-between group hover:bg-white/10 transition-colors`}>
                        <div className="flex items-center gap-6 w-1/3">
                          <span className={`font-bold text-lg min-w-[100px] ${textClass}`}>
                            {i === 0 ? 'Today' : format(new Date(item.dt * 1000), 'EEEE')}
                          </span>
                          <img 
                            src={`https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`} 
                            alt="icon" 
                            className="w-12 h-12"
                          />
                        </div>
                        
                        <div className="flex flex-col items-center w-1/3">
                          <span className={`font-semibold capitalize ${theme === 'dark' ? 'text-white/90' : 'text-slate-800'}`}>{item.weather[0].description}</span>
                          <div className="flex items-center gap-2 text-xs text-blue-400 font-bold mt-1">
                            <Droplets className="w-3 h-3" />
                            {Math.round((item.pop || 0) * 100)}% Precipitation
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-4 w-1/3">
                          <div className="text-right">
                            <span className={`block font-bold text-2xl ${textClass}`}>{Math.round(item.main.temp_max)}°</span>
                            <span className={`block ${subTextClass} text-xs font-bold uppercase tracking-widest`}>High</span>
                          </div>
                          <div className={`w-px h-8 ${borderClass}`} />
                          <div className="text-right">
                            <span className={`block font-bold text-xl ${theme === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>{Math.round(item.main.temp_min)}°</span>
                            <span className={`block ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'} text-xs font-bold uppercase tracking-widest`}>Low</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className={`p-8 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} border-t ${borderClass} text-center`}>
                <p className={`${theme === 'dark' ? 'text-white/30' : 'text-slate-400'} text-[10px] uppercase font-bold tracking-[0.2em]`}>
                  Data updated every 3 hours • Powered by OpenWeatherMap
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
