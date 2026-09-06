"""
Shelf2Cash — ML Microservice (FastAPI)
Endpoints:
  POST /forecast      — WMA/ES demand forecasting
  POST /health-score  — Financial health sub-score computation
  POST /credit-score  — Multi-factor credit score
  GET  /health        — Service health check
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import numpy as np

from forecasting import forecast_product

app = FastAPI(title="Shelf2Cash ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────────────────────

class SalesDay(BaseModel):
    date: str
    units: float

class ProductMeta(BaseModel):
    category: str
    perishable: bool = False
    sellingPrice: float = 0

class ForecastRequest(BaseModel):
    salesHistory: List[SalesDay]
    productMeta: Optional[ProductMeta] = None
    currentStock: Optional[int] = None
    externalMultiplier: float = 1.0


class HealthScoreRequest(BaseModel):
    stockoutRiskItems: int
    totalActiveItems: int
    deadStockRatio: float       # 0.0 – 1.0
    capitalConversionDays: float
    overdueRatio: float         # 0.0 – 1.0


class CreditScoreRequest(BaseModel):
    salesConsistencyCV: float   # coefficient of variation of monthly sales
    inventoryQualityRatio: float
    paymentDisciplineRatio: float
    digitalPaymentRatio: float
    collectionEfficiencyRatio: float
    yearsInBusiness: int


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "shelf2cash-ml"}


@app.post("/forecast")
def forecast(req: ForecastRequest):
    history = [{"date": d.date, "units": d.units} for d in req.salesHistory]
    result = forecast_product(
        sales_history=history,
        current_stock=req.currentStock,
        external_multiplier=req.externalMultiplier
    )
    return result


@app.post("/health-score")
def compute_health_score(req: HealthScoreRequest):
    """
    Compute the 4 sub-scores of the Financial Health Score.
    Node backend uses this for independent ML-side verification; 
    primary computation is in FinancialHealthService.js.
    """
    # Stockout risk score
    stockout_penalty = (req.stockoutRiskItems / max(req.totalActiveItems, 1)) * 100
    stockout_score = max(0, min(100, 100 - stockout_penalty * 1.5))

    # Dead stock score  
    dead_score = max(0, min(100, (1 - req.deadStockRatio * 2) * 100))

    # Cash buffer score (0–15 days = 100, 60+ days = 0)
    cash_score = max(0, min(100, (1 - (req.capitalConversionDays - 15) / 45) * 100))

    # Collection score (0% overdue = 100, 60%+ = 0)
    collection_score = max(0, min(100, (1 - req.overdueRatio * 1.67) * 100))

    composite = round(
        stockout_score * 0.25 +
        dead_score * 0.25 +
        cash_score * 0.25 +
        collection_score * 0.25
    )

    return {
        "composite": composite,
        "subScores": {
            "stockoutRisk": round(stockout_score, 1),
            "deadStock": round(dead_score, 1),
            "cashBuffer": round(cash_score, 1),
            "collection": round(collection_score, 1)
        }
    }


@app.post("/credit-score")
def compute_credit_score(req: CreditScoreRequest):
    """ML-computed credit score factors."""
    # Sales consistency: low CV = high score
    sales_score = max(20, min(100, (1 - req.salesConsistencyCV) * 100))

    inventory_score = round(req.inventoryQualityRatio * 100)
    payment_score = round(req.paymentDisciplineRatio * 100)
    digital_score = round(req.digitalPaymentRatio * 100)
    collection_score = round(req.collectionEfficiencyRatio * 100)
    tenure_score = min(100, req.yearsInBusiness * 10 + 20)

    composite = round(
        sales_score * 0.25 +
        inventory_score * 0.20 +
        payment_score * 0.20 +
        digital_score * 0.15 +
        collection_score * 0.10 +
        tenure_score * 0.10
    )

    return {
        "composite": composite,
        "factors": {
            "salesConsistency": round(sales_score),
            "inventoryQuality": inventory_score,
            "paymentDiscipline": payment_score,
            "digitalFootprint": digital_score,
            "collectionEfficiency": collection_score,
            "businessTenure": tenure_score
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
