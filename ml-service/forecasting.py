"""
Shelf2Cash — Forecasting Engine
Weighted Moving Average (WMA) + Exponential Smoothing (ES)
Model selection: whichever has lower MAPE on last 7 days of actuals
"""

import numpy as np
from typing import List, Dict, Any, Optional


def weighted_moving_average(sales: List[float], window: int = 14) -> Dict[str, Any]:
    """
    WMA with linearly increasing weights (most recent = highest weight).
    Returns daily forecast + 80% confidence interval.
    """
    if len(sales) == 0:
        return {"forecast": 0.0, "lower": 0.0, "upper": 0.0, "confidence": 0.3}

    recent = sales[-window:] if len(sales) >= window else sales
    n = len(recent)

    weights = np.arange(1, n + 1, dtype=float)
    weight_sum = weights.sum()
    forecast = float(np.dot(weights, recent) / weight_sum)

    # Residuals for confidence interval
    errors = []
    for i in range(max(1, n - 7), n):
        sub = recent[:i]
        if len(sub) == 0:
            continue
        w = np.arange(1, len(sub) + 1, dtype=float)
        pred = float(np.dot(w, sub) / w.sum())
        errors.append(abs(recent[i] - pred))

    mae = float(np.mean(errors)) if errors else forecast * 0.2
    std_dev = float(np.std(errors)) if len(errors) > 1 else mae

    # Confidence = inverse of coefficient of variation
    mean_sales = float(np.mean(recent))
    cv = std_dev / mean_sales if mean_sales > 0 else 1.0
    confidence = max(0.3, min(0.95, 1.0 - cv * 0.5))

    return {
        "forecast": max(0.0, forecast),
        "lower": max(0.0, forecast - 1.28 * std_dev),  # 80% CI
        "upper": forecast + 1.28 * std_dev,
        "confidence": round(confidence, 3),
        "mae": round(mae, 3)
    }


def exponential_smoothing(sales: List[float], alpha: float = 0.3) -> Dict[str, Any]:
    """
    Simple Exponential Smoothing with auto-optimised alpha via grid search.
    """
    if len(sales) == 0:
        return {"forecast": 0.0, "lower": 0.0, "upper": 0.0, "confidence": 0.3}

    # Grid search for best alpha (min MAPE on last 7 days)
    best_alpha = alpha
    best_mape = float("inf")

    if len(sales) >= 14:
        train = sales[:-7]
        test = sales[-7:]

        for a in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]:
            smoothed = _es_smooth(train, a)
            errors = [abs(test[i] - smoothed) / max(test[i], 1) for i in range(len(test))]
            mape = float(np.mean(errors))
            if mape < best_mape:
                best_mape = mape
                best_alpha = a

    smoothed_value = _es_smooth(sales, best_alpha)

    # Residual std for CI
    residuals = []
    s = sales[0]
    for actual in sales[1:]:
        residuals.append(abs(actual - s))
        s = best_alpha * actual + (1 - best_alpha) * s

    std_dev = float(np.std(residuals)) if residuals else smoothed_value * 0.2
    mean_sales = float(np.mean(sales[-14:]))
    cv = std_dev / mean_sales if mean_sales > 0 else 1.0
    confidence = max(0.3, min(0.95, 1.0 - cv * 0.5))

    return {
        "forecast": max(0.0, smoothed_value),
        "lower": max(0.0, smoothed_value - 1.28 * std_dev),
        "upper": smoothed_value + 1.28 * std_dev,
        "confidence": round(confidence, 3),
        "alpha_used": best_alpha,
        "mae": round(best_mape if best_mape < float("inf") else std_dev, 3)
    }


def _es_smooth(data: List[float], alpha: float) -> float:
    if not data:
        return 0.0
    s = float(data[0])
    for value in data[1:]:
        s = alpha * float(value) + (1 - alpha) * s
    return s


def select_best_model(sales: List[float]) -> str:
    """Return 'WMA' or 'ES' based on MAPE on last 7 days."""
    if len(sales) < 14:
        return "WMA"  # not enough data to compare

    train = sales[:-7]
    test = sales[-7:]

    wma_result = weighted_moving_average(train, window=14)
    wma_pred = wma_result["forecast"]
    wma_mape = float(np.mean([abs(test[i] - wma_pred) / max(test[i], 1) for i in range(len(test))]))

    es_result = exponential_smoothing(train)
    es_pred = es_result["forecast"]
    es_mape = float(np.mean([abs(test[i] - es_pred) / max(test[i], 1) for i in range(len(test))]))

    return "WMA" if wma_mape <= es_mape else "ES"


def forecast_product(
    sales_history: List[Dict[str, Any]],
    current_stock: Optional[int] = None,
    external_multiplier: float = 1.0
) -> Dict[str, Any]:
    """
    Main forecasting function called from FastAPI endpoint.
    sales_history: [{"date": "2026-01-01", "units": 4}, ...]
    Returns: daily_forecast, forecast_7d, days_to_stockout, confidence, model_used
    """
    units = [float(d.get("units", 0)) for d in sales_history]

    if len(units) < 3:
        return {
            "daily_forecast": 0.0,
            "forecast_7d": [0] * 7,
            "days_to_stockout": 999,
            "confidence": 0.2,
            "model_used": "INSUFFICIENT_DATA"
        }

    best_model = select_best_model(units)

    if best_model == "WMA":
        result = weighted_moving_average(units)
    else:
        result = exponential_smoothing(units)

    base_forecast = result["forecast"] * external_multiplier
    base_forecast = max(0.0, base_forecast)

    # Generate 7-day forecast with small variation
    rng = np.random.default_rng(42)  # deterministic seed for consistent demo
    forecast_7d = [
        max(0, round(base_forecast * rng.uniform(0.85, 1.15)))
        for _ in range(7)
    ]

    # Days to stockout
    if current_stock is not None and base_forecast > 0:
        days_to_stockout = int(current_stock / base_forecast)
    else:
        days_to_stockout = 999

    return {
        "daily_forecast": round(base_forecast, 2),
        "forecast_7d": forecast_7d,
        "days_to_stockout": min(days_to_stockout, 999),
        "confidence": result["confidence"],
        "model_used": best_model,
        "lower_bound": round(result["lower"] * external_multiplier, 2),
        "upper_bound": round(result["upper"] * external_multiplier, 2)
    }
