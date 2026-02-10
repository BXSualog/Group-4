# JuantreePH - Comprehensive Plant & Agarwood Management Platform

**JuantreePH** (also branded as **AgarwoodTrackerPH**) is a premium full-stack platform designed for high-precision agricultural monitoring, AI-driven plant diagnostics, and community-driven knowledge sharing. It specifically focuses on Philippine flora, agarwood cultivation, and sustainable forestry management.

## 🚀 Core Features

### 🌱 Advanced Plant Monitoring
- **Precision Tracking**: Monitor growth metrics, health status, and maintenance history for individual plants.
- **Geotagged Visualization**: Interactive farm map with satellite view, clustering, and precise GPS positioning.
- **Dynamic Field Telemetry**: Live environmental data including local weather, sunlight periods, and RTK-level accuracy estimations.

### 🤖 AI-Powered Plant Doctor
- **Instant Diagnosis**: Upload high-resolution photos for immediate AI-driven health assessments.
- **Deep Scan Technology**: Advanced multi-disease detection capable of identifying microscopic spots, molds, and nutrient deficiencies.
- **Resource Management**: Role-based AI usage quotas (Free, Steward, and Premium tiers) ensuring sustainable service delivery.

### 📚 Knowledge & Heritage Hub
- **Educational Library**: Deep dives into Regenerative Agriculture, Agroforestry Design, and Plant Physiology.
- **Flora Filipiana**: A curated digital herbarium of Philippine endemic species, including agarwood varieties and endemic timber.
- **Interactive Carousels**: Visual exploration of endemic trees and sustainable forestry practices.

### 👥 Stewardship & Community
- **Multi-Role Ecosystem**: Tailored experiences for Free Users, Professional Stewards, and Administrators.
- **Stewardship's Grove**: A dedicated workspace for professional caretakers to manage client portfolios, routines, and tasks.
- **Automated Routines**: Intelligent generation of care schedules based on plant species and environmental factors.

### 💬 Integrated Communication
- **Real-Time Messaging**: Direct communication between owners and professional stewards.
- **Global Alert System**: System-wide notifications and administrative broadcasts for critical updates.
- **Activity Logging**: Comprehensive audit trails for plant maintenance and user engagement.

## 🛠️ Technology Stack

- **Backend**: Node.js & Express 5 (Modular Route Architecture)
- **Database**: MySQL 2 with advanced connection pooling
- **Real-time**: Socket.IO for live telemetry and instant notifications
- **Security**: JWT-based authentication, bcrypt hashing, and Zod schema validation
- **Frontend**: Vanilla JavaScript (ES6+), Modern CSS (Flexbox/Grid), and modular component design
- **Performance**: Service Worker implementation for offline resilience and asset caching

## 📂 Project Structure

```
JuantreePH/
├── public/                 # Frontend assets (HTML, CSS, JS)
│   ├── css/               # Modular styling system
│   ├── js/                # Component logic and API integration
│   └── ...
├── src/                    # Backend source code
│   ├── ai/                # AI diagnostic logic
│   ├── config/            # Database and system configuration
│   ├── helpers/           # Shared utility functions
│   ├── middleware/        # Auth and validation middleware
│   ├── routes/            # Modular API endpoint handlers
│   └── validation/        # Zod request validation schemas
├── scripts/               # Maintenance and data utility scripts
└── server.js              # Application entry point & DB initialization
```

## 🚥 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MySQL 8.0+
- npm

### Installation & Setup

1. **Clone & Install**:
   ```bash
   git clone https://github.com/yourusername/JuantreePH.git
   cd JuantreePH
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file in the root directory:
   ```env
   DB_HOST=your_host
   DB_USER=your_user
   DB_PASSWORD=your_password
   DB_NAME=juantree_db
   JWT_SECRET=your_secure_secret
   ADMIN_EMAIL=admin@example.com
   ```

3. **Launch**:
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3000`.

## 📜 License & Purpose

Developed for agricultural advancement and educational research in the Philippines. All rights reserved.
