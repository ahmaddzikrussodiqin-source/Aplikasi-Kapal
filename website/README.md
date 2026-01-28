# KapalList Website

Website version of the KapalList mobile application for ship management.

## Features

- **Authentication**: Login/Register with role-based access
- **Ship Management**: CRUD operations for ship information
- **Ship Status Tracking**: Real-time checklist system with Socket.io
- **Document Management**: Upload and manage ship documents with expiration tracking
- **User Management**: Admin panel for managing users
- **Real-time Updates**: Live checklist synchronization

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **State Management**: React Context
- **Real-time**: Socket.io Client
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Backend server running (see backend/README.md)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
```

## Project Structure

```
website/
├── public/
│   └── index.html
├── src/
│   ├── components/     # Reusable components
│   ├── pages/         # Page components
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── DaftarKapal.jsx
│   │   ├── KapalMasuk.jsx
│   │   ├── Dokumen.jsx
│   │   ├── Profile.jsx
│   │   └── ManageUsers.jsx
│   ├── services/
│   │   └── api.js     # API functions
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## User Roles

- **Moderator**: Full access including user management
- **Supervisi**: Limited access to ship operations
- **Member**: Basic access to ship operations

## API Integration

The website connects to the Node.js backend API. Make sure the backend is running and accessible.

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000
```

## Features Overview

### Dashboard
Main menu with access to all features based on user role.

### Ship Management (Daftar Kapal)
- View all registered ships
- Add new ships with detailed information
- Edit existing ship information
- Delete ships

### Ship Status (Kapal Masuk)
- Track ship preparation status
- Real-time checklist system
- Mark items as completed with dates
- Finish/unfinish ship preparation

### Document Management
- Upload images and PDFs for ships
- View documents by ship
- Track document expiration dates
- Download/view documents

### User Management (Admin Only)
- View all users
- Create new users
- Edit user information and roles
- Delete users

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the KapalList application suite.
