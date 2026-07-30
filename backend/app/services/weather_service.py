"""Open-Meteo integration using the official openmeteo-requests client pattern.

Never raises on network failure; returns ``available=False`` so assessments can
continue and clearly state that live weather was unavailable.
"""

from __future__ import annotations

from datetime import date
from functools import lru_cache
from pathlib import Path

import numpy as np
import openmeteo_requests
import pandas as pd
import requests_cache
from retry_requests import retry

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

_CACHE_DIR = Path(__file__).resolve().parent.parent.parent / ".cache"


@lru_cache(maxsize=1)
def _client() -> openmeteo_requests.Client:
    """Setup the Open-Meteo API client with cache and retry on error."""
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_session = requests_cache.CachedSession(str(_CACHE_DIR), expire_after=3600)
    retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
    return openmeteo_requests.Client(session=retry_session)


def _sum_mm(values) -> float | None:
    if values is None:
        return None
    arr = np.asarray(values, dtype=float)
    arr = arr[~np.isnan(arr)]
    if arr.size == 0:
        return None
    return round(float(arr.sum()), 1)


def _max_c(values) -> float | None:
    if values is None:
        return None
    arr = np.asarray(values, dtype=float)
    arr = arr[~np.isnan(arr)]
    if arr.size == 0:
        return None
    return round(float(arr.max()), 1)


def get_weather(latitude: float | None, longitude: float | None) -> dict:
    result: dict = {
        "available": False,
        "latitude": latitude,
        "longitude": longitude,
        "rainfall_7d_mm": None,
        "rainfall_14d_mm": None,
        "rainfall_30d_mm": None,
        "rainfall_forecast_7d_mm": None,
        "current_temp_c": None,
        "forecast_max_temp_c": None,
        "source": "Open-Meteo",
        "note": None,
    }
    if latitude is None or longitude is None:
        result["note"] = "No coordinates on file for this camp, so live weather could not be retrieved."
        return result

    today = date.today()
    try:
        openmeteo = _client()

        # Recent rainfall (past ~30 days) + today. Variable order must match below.
        params_recent = {
            "latitude": latitude,
            "longitude": longitude,
            "daily": ["precipitation_sum"],
            "past_days": 31,
            "forecast_days": 1,
            "timezone": "auto",
        }
        responses = openmeteo.weather_api(FORECAST_URL, params=params_recent)
        response = responses[0]

        daily = response.Daily()
        daily_precipitation_sum = daily.Variables(0).ValuesAsNumpy()
        daily_data = {
            "date": pd.date_range(
                start=pd.to_datetime(daily.Time(), unit="s", utc=True),
                end=pd.to_datetime(daily.TimeEnd(), unit="s", utc=True),
                freq=pd.Timedelta(seconds=daily.Interval()),
                inclusive="left",
            ),
            "precipitation_sum": daily_precipitation_sum,
        }
        recent_df = pd.DataFrame(data=daily_data)
        # Exclude today's incomplete day from "past" rainfall windows.
        past = recent_df.iloc[:-1] if len(recent_df) > 1 else recent_df
        precip = past["precipitation_sum"].to_numpy()
        result["rainfall_7d_mm"] = _sum_mm(precip[-7:])
        result["rainfall_14d_mm"] = _sum_mm(precip[-14:])
        result["rainfall_30d_mm"] = _sum_mm(precip[-30:])

        # Current temperature + 7-day forecast. Variable order must match below.
        params_forecast = {
            "latitude": latitude,
            "longitude": longitude,
            "current": ["temperature_2m"],
            "daily": ["precipitation_sum", "temperature_2m_max"],
            "forecast_days": 7,
            "timezone": "auto",
        }
        responses = openmeteo.weather_api(FORECAST_URL, params=params_forecast)
        response = responses[0]

        current = response.Current()
        if current is not None and current.VariablesLength() > 0:
            val = current.Variables(0).Value()
            if val is not None and not (isinstance(val, float) and np.isnan(val)):
                result["current_temp_c"] = round(float(val), 1)

        daily = response.Daily()
        daily_precipitation_sum = daily.Variables(0).ValuesAsNumpy()
        daily_temperature_2m_max = daily.Variables(1).ValuesAsNumpy()
        forecast_df = pd.DataFrame(
            data={
                "date": pd.date_range(
                    start=pd.to_datetime(daily.Time(), unit="s", utc=True),
                    end=pd.to_datetime(daily.TimeEnd(), unit="s", utc=True),
                    freq=pd.Timedelta(seconds=daily.Interval()),
                    inclusive="left",
                ),
                "precipitation_sum": daily_precipitation_sum,
                "temperature_2m_max": daily_temperature_2m_max,
            }
        )
        result["rainfall_forecast_7d_mm"] = _sum_mm(forecast_df["precipitation_sum"].to_numpy())
        result["forecast_max_temp_c"] = _max_c(forecast_df["temperature_2m_max"].to_numpy())

        result["available"] = True
        result["note"] = (
            f"Live weather from Open-Meteo on {today.isoformat()} "
            f"({response.Latitude():.2f}°N, {response.Longitude():.2f}°E, "
            f"{response.Elevation():.0f} m asl)."
        )
    except Exception as exc:  # noqa: BLE001
        result["available"] = False
        result["note"] = (
            f"Live weather was unavailable ({type(exc).__name__}); "
            "assessment continues on other evidence."
        )
    return result
