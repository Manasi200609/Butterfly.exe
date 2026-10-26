# Butterfly.exe 
### Discover the consequences before they happen.

Butterfly.exe is an interactive consequence-discovery simulator that lets users change conditions in interconnected systems, run experiments, and compare outcomes. Instead of passively viewing predictions, users can intervene and observe what happens next.

## 🌍 Worlds

- **City:** Explore a 3D road network, close roads, and compare commuter routes, queues, and delays.
- **Ecosystem:** Explore interactions and changes within an interconnected environment.
- **Unknown:** Investigate an evolving network and observe how its connections change over time.

## ✨ Key Features

- Interactive 3D environments using native WebGL.
- Baseline-versus-intervention simulation experiments.
- Deterministic results for reproducible comparisons.
- Measurable outcomes and simulation evidence.
- Full-stack JavaScript architecture.

## 🛠️ Tech Stack

**Frontend:** React, Vite, native WebGL  
**Backend:** Node.js, Express.js  
**Database:** MongoDB with Mongoose  
**Language:** JavaScript

## 🚀 Run Locally

### Prerequisites
- Node.js 20 or later
- npm
- MongoDB connection, if using database persistence

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd BrieflyAI
```

### 2. Configure the backend

```bash
cd server
npm install
```

Create a `.env` file using `.env.example` as a template. Configure the required environment variables for your setup.

Start the backend:

```bash
npm run dev
```

### 3. Start the frontend

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite in your browser.

## 🧪 Testing

Run the backend tests:

```bash
cd server
npm test
```

Check the backend JavaScript syntax:

```bash
npm run check
```

Build the frontend:

```bash
cd client
npm run build
```

## 💡 Example Experiment

In the City world, run a baseline simulation with six commuters. Close the `home-central` road, rerun the simulation, and compare the resulting routes, queue waits, and travel delays. Results depend on the implemented model and its assumptions.

## 🎯 Vision

We want to make complex systems easier to understand by allowing people to experiment with changes, discover unexpected outcomes, and examine evidence before making decisions.

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
