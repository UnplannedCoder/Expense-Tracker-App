# Expense Tracker App

A full-stack expense tracking application built with React and Express that helps users manage transactions, budgets, categories, reports, and financial insights in one place.

## Features

- User authentication and profile management
- Add, edit, and view transactions
- Organize transactions by categories
- Create and track budgets
- View reports and financial insights
- AI-powered financial assistant for guidance and questions
- Receipt/image-based analysis support
- Group-based financial collaboration

## Tech Stack

### Frontend
- React
- Vite
- React Router
- Tailwind CSS
- Recharts
- Axios

### Backend
- Node.js
- Express
- MongoDB with Mongoose
- JWT authentication
- Helmet, CORS, Morgan

## Project Structure

```text
client/        # React frontend
server/        # Express backend
```

## Prerequisites

Make sure you have the following installed:
- Node.js (v18 or newer recommended)
- npm
- MongoDB instance or MongoDB Atlas connection string

## Getting Started

### 1. Install dependencies

Install frontend dependencies:

```bash
cd client
npm install
```

Install backend dependencies:

```bash
cd ../server
npm install
```

### 2. Configure environment variables

Create a `.env` file inside the `server` directory with the following variables:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
OPENROUTER_API_KEY=your_api_key
```

### 3. Run the app

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend in a new terminal:

```bash
cd client
npm run dev
```

The frontend should be available at `http://localhost:5173` and the backend at `http://localhost:5000`.

## Available Scripts

### Client
- `npm run dev` - start the Vite development server
- `npm run build` - create a production build
- `npm run preview` - preview the production build

### Server
- `npm run dev` - start the backend with nodemon
- `npm start` - start the backend normally

## Notes

- AI-related features may require a valid OpenRouter API key.
- The app expects a running MongoDB database for authentication and data persistence.

## License

This project is for educational and personal use.
