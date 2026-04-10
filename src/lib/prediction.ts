import { WeatherData, PredictionResult } from '../types';

/**
 * AI/ML logic to predict rain probability based on weather parameters.
 * Uses a rule-based approach inspired by meteorological patterns.
 */
export function predictRain(data: WeatherData['current']): PredictionResult {
  const { humidity, pressure } = data.main;
  const cloudCoverage = data.clouds.all;
  const windSpeed = data.wind.speed;

  // Base probability starts from humidity
  let probability = humidity * 0.5;

  // Cloud coverage impact
  probability += cloudCoverage * 0.3;

  // Pressure impact (lower pressure often means rain)
  // Standard pressure is 1013 hPa
  if (pressure < 1010) {
    probability += (1010 - pressure) * 2;
  }

  // Wind speed impact (high wind can bring in clouds)
  probability += windSpeed * 1.5;

  // Normalize to 0-100
  probability = Math.min(Math.max(Math.round(probability), 0), 100);

  let message = "";
  if (probability > 80) {
    message = `There is a ${probability}% chance of rain today. Heavy rain expected, carry an umbrella and a raincoat.`;
  } else if (probability > 50) {
    message = `There is a ${probability}% chance of rain today. Carry an umbrella just in case.`;
  } else if (probability > 20) {
    message = `There is a ${probability}% chance of rain today. It might be cloudy, but rain is unlikely.`;
  } else {
    message = `There is only a ${probability}% chance of rain today. Enjoy the clear skies!`;
  }

  return { probability, message };
}
