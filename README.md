# JuantreePH - Comprehensive Plant & Agarwood Management Platform

**JuantreePH** (also branded as **AgarwoodTrackerPH**) is a full-stack web application designed for **agricultural monitoring, plant management, and community-driven knowledge sharing**, with a specific focus on **Philippine flora, agarwood cultivation, and sustainable forestry practices**.

## Core Features

### 🌱 Plant Management & Monitoring
- **Real-time Plant Tracking**: Monitor individual plants with detailed profiles including location, height, health status, and growth metrics
- **Satellite View & Live Telemetry**: Visualize plant locations with precise GPS coordinates and real-time environmental data (weather, sunrise/sunset times)
- **Task & Routine Management**: Create and track care schedules, automated routine generation, and progress tracking for plant maintenance

### 🤖 AI-Powered Plant Doctor
- **Image-Based Disease Diagnosis**: Upload plant photos for instant AI analysis and health assessment
- **Deep Scan Technology**: Advanced multi-disease detection capable of identifying even minor spots and molds
- **AI Usage Quotas**: Role-based limits (Free, Steward, Premium tiers) for sustainable AI resource management

### 📚 Knowledge Hub & Education
Educational content library covering:
- Regenerative Agriculture
- Agroforestry Design
- Heritage & Native Seeds
- Plant Physiology 101
- The Future of Food Systems

### 🇵🇭 Flora Filipiana Collection
Curated database of Philippine endemic species including:
- Agarwood varieties
- Endemic trees
- Sustainable timber species
- Native plant documentation with images and detailed information

### 👥 Multi-Role User System
- **Free Users**: Basic access to plant tracking and limited AI features
- **Stewards**: Community leaders with enhanced privileges (10 weekly image analyses, 5 deep scans)
- **Premium Users**: Full access to all platform features
- **Administrators**: Complete system control, user management, and steward application review

### 💬 Communication & Collaboration
- Real-time messaging system between users
- System-wide alerts and broadcast notifications
- Admin panel for communications management
- Activity logging and user engagement tracking

### ⚙️ Technical Infrastructure
- **Backend**: Node.js/Express with MySQL database
- **Real-time Features**: Socket.IO for live updates and notifications
- **Authentication**: JWT-based secure authentication with bcrypt password hashing
- **Progressive Web App**: Service worker implementation for offline caching
- **File Management**: Multer-based image upload system with validation

## Target Users

- **Agarwood Farmers & Investors**: Track cultivation investments and monitor growth
- **Agricultural Stewards**: Community knowledge-keepers and mentors
- **Sustainability Advocates**: Users interested in Philippine native flora and sustainable practices
- **Researchers & Educators**: Access to comprehensive plant databases and educational resources

## Technology Stack

- **Backend**: Node.js, Express 5, MySQL 2, Socket.IO
- **Security**: JWT, bcrypt, Zod validation
- **Database**: MySQL with connection pooling
- **File Handling**: Multer for multipart form uploads
- **Frontend**: Vanilla JavaScript, responsive CSS, modular component architecture

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/JuantreePH.git
cd JuantreePH
```

2. Install dependencies:
```bash
npm install
```

3. Configure database connection:
   - Create a `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=bx_database
```

4. Start the server:
```bash
npm start
```

5. Access the application at `http://localhost:3000`

## Project Structure
```
JuantreePH/
├── public/           # Frontend files (HTML, CSS, JS)
├── src/
│   ├── ai/          # AI logic for plant diagnosis
│   ├── config/      # Database configuration
│   ├── routes/      # API route handlers
│   └── helpers/     # Utility functions
├── scripts/         # Maintenance and utility scripts
└── server.js        # Main application entry point
```

## Contributing

This platform combines **agricultural technology, AI diagnostics, community building, and education** to create a comprehensive ecosystem for sustainable plant management in the Philippines.

## License

This project is developed for educational and agricultural advancement purposes.