<div align="center">
  <h1>Shelf2Cash</h1>
  <p><strong>A Physical-to-Financial Intelligence Platform for India's Small Retailers (Kiranas)</strong></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
  [![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-24-green.svg)](https://nodejs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688.svg)](https://fastapi.tiangolo.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg)](https://mongodb.com/)
  [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
</div>

<br />

##  The Vision

This is **not** an inventory management app. It is a **Financial Intelligence Engine**. 

India's 12+ million Kirana stores struggle with trapped working capital. They overstock slow-moving items, run out of fast-moving items, and have zero visibility into their actual cash conversion cycles. **Shelf2Cash** solves this by bridging the physical world (shelves) with the financial world (working capital). 

Every feature in this platform is designed to answer one question: *How do we unlock trapped cash for the retailer?*

---

##  Core Features

### 1.  Camera Shelf Verification (Physical-to-Digital)
Trusting manual data entry is flawed. Shelf2Cash uses the phone camera (simulating Edge CV inference) to count inventory on the shelf and immediately compares it to the digital ledger. 
- Discrepancies aren't just shown as missing units; they are **framed as financial impact** (e.g., *"10 units missing = ₹1,450 trapped capital"*).

### 2.  Kirana Mesh (Cluster Intelligence)
Why buy from a distributor when the store 2km away is desperately trying to liquidate the exact item you are about to run out of?
- Uses **Geospatial Queries (MongoDB 2dsphere)** to pair SURPLUS stores with SHORTAGE stores.
- Real-time WebSocket matchmaking and dynamic demand signal detection.

### 3.  What-If Simulator (ML Forecasting)
Retailers usually guess how much to buy. We let them simulate the future. 
- Interactive sliders for purchase quantities, supplier delays, and upcoming festivals.
- Calls our **Python ML Service (WMA / Exponential Smoothing)** to instantly recalculate 30-day cash flow projections.

### 4.  Micro-Factoring (Inventory as Collateral)
Instant capital advances tied to the Cash Conversion Clock. 
- Since we know exactly how fast an SKU sells (velocity tier) and the forecast confidence, we treat the **inventory itself as collateral**. No credit checks needed.

### 5.  Digital Khata (WhatsApp Integration)
A digital ledger for customer credit with single-click WhatsApp reminders.
- Uses **WhatsApp Click-to-Chat (wa.me)** links to instantly pre-fill payment reminders, requiring absolutely zero API setup.

---

##  Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React (Vite), Zustand, Framer Motion, Recharts, Leaflet | High-performance, phone-native UI with a premium "FinTech Dark" aesthetic. |
| **Backend** | Node.js, Express, WebSockets, node-cron | Robust API gateway, background cron jobs, and real-time event broadcaster. |
| **ML Microservice**| Python, FastAPI, Pandas, Scikit-learn, Numpy | Dedicated microservice for predictive analytics and dynamic model selection. |
| **Database** | MongoDB & Mongoose | Document store with Geospatial `$nearSphere` indexing for Kirana Mesh. |

---

##  API Integrations & Signals

Shelf2Cash is "network-aware" and listens to the real world to generate intelligent buy/sell signals:
1. **[Data.gov.in (Agmarknet)](https://data.gov.in/)**: Polls live wholesale commodity prices (Onion, Potato, Tomato) to detect price crashes and generate "Wait to buy" signals.
2. **[OpenWeatherMap](https://openweathermap.org/api)**: Polls 5-day forecasts. If a heatwave is detected, it automatically bumps the predicted demand for cold beverages.
3. **[Account Aggregator Framework (RBI)](https://sahamati.org.in/)**: The Kirana Credit Score screen adheres to the AA framework formatting, making it instantly exportable as a lender-ready one-pager.

> *Note: Graceful mock fallbacks are built-in. The app functions 100% perfectly for demos even without providing real API keys.*

---

##  Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.9+)
- **MongoDB** (Local instance or Atlas URI)

### 2. Environment Setup
Create a `.env` file in the `backend/` directory:
```env
MONGODB_URI=mongodb://localhost:27017/shelf2cash
PORT=5000
ML_SERVICE_URL=http://localhost:8000
OPENWEATHER_API_KEY=your_key_here  # Optional
DATA_GOV_API_KEY=your_key_here     # Optional
```

### 3. Install & Seed
Install all dependencies and run the powerful database seeder (generates 5 stores and 90-days of historical transactions):
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install
cd ../ml-service && pip install -r requirements.txt

# Seed the database
cd ../backend
node src/seed/run.js
```

### 4. Run the Application
We've included a convenient startup script for Windows users! From the root directory, simply run:
```bash
start.bat
```
*(This will automatically launch the ML Service on `:8000`, the Node Backend on `:5000`, and the React Frontend on `:5173`)*

---

<div align="center">
  <p>Built with ❤️ by <strong>Ishan Vaidya</strong></p>
</div>
