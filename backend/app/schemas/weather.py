from pydantic import BaseModel


class WeatherRead(BaseModel):
    available: bool
    latitude: float | None = None
    longitude: float | None = None
    rainfall_7d_mm: float | None = None
    rainfall_14d_mm: float | None = None
    rainfall_30d_mm: float | None = None
    rainfall_forecast_7d_mm: float | None = None
    current_temp_c: float | None = None
    forecast_max_temp_c: float | None = None
    note: str | None = None
