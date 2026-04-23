export interface WeatherData {
  current: {
    main: {
      temp: number;
      humidity: number;
      pressure: number;
      feels_like: number;
    };
    wind: {
      speed: number;
    };
    clouds: {
      all: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    name: string;
    sys: {
      country: string;
    };
  };
  forecast: {
    list: Array<{
      dt: number;
      main: {
        temp: number;
        humidity: number;
        pressure: number;
      };
      weather: Array<{
        main: string;
        description: string;
        icon: string;
      }>;
      clouds: {
        all: number;
      };
      wind: {
        speed: number;
      };
      pop: number;
    }>;
  };
}

export interface PredictionResult {
  probability: number;
  message: string;
}

export interface GeocodeResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}
