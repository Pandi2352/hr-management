# PeopleOS — Frontend Setup & Architecture Guide

This document defines the exact folder structure, installation steps, and Tailwind CSS v4 Vite integration for the **PeopleOS** frontend application (`frontend/`).

---

## 1. Frontend Directory Structure

```
frontend/src/
├── app/
│   ├── App.tsx             # Root component with Providers
│   ├── routes.tsx          # Router configuration
│   └── providers.tsx       # Global Provider Wrapper (Theme, Sidebar)
│
├── assets/                 # Static assets (images, logos, illustrations)
│   └── illustration.tsx    # Responsive SVG components for sidebar decoration
│
├── components/
│   ├── ui/                 # Reusable generic UI components (copy-friendly)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Dropdown.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Badge.tsx
│   │   └── index.ts
│   │
│   ├── layout/             # Portable App Shell Layout
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── SidebarItem.tsx
│   │   │   ├── SidebarGroup.tsx
│   │   │   ├── sidebar.config.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── Navbar/
│   │   │   ├── Navbar.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── Notification.tsx
│   │   │   ├── UserMenu.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── MainLayout.tsx  # Core Shell (integrates Sidebar + Navbar + Content)
│   │   └── AuthLayout.tsx  # Auth Shell (if needed)
│   │
│   └── common/             # Common application items
│       ├── Loader.tsx
│       └── ErrorBoundary.tsx
│
├── features/               # Isolated business/feature modules
│   └── dashboard/
│       ├── Dashboard.tsx   # Dashboard Page View
│       ├── components/
│       │   ├── StatsCard.tsx            # KPI card with custom sparklines
│       │   ├── SalesChart.tsx           # Dual-line chart (Revenue / Orders)
│       │   ├── CategoryDistribution.tsx # Donut chart for category sales share
│       │   ├── OrderStatusChart.tsx     # Radial progress rings for order statuses
│       │   ├── RecentActivity.tsx       # Order/customer events list
│       │   ├── TopProducts.tsx          # Best-selling products with progress bars
│       │   └── LiveOrders.tsx           # Live-like recent orders feed
│       └── types.ts
│
├── hooks/                  # Global hooks
│   ├── useTheme.ts         # Dark/Light theme manager
│   ├── useSidebar.ts       # Sidebar responsive collapse state
│   └── useDebounce.ts
│
├── utils/                  # Reusable helper functions
│   ├── cn.ts               # Tailwind class merge helper
│   ├── formatCurrency.ts   # ₹/localized currency formatting
│   ├── formatDate.ts
│   └── storage.ts
│
├── styles/
│   └── globals.css         # Customized Tailwind v4 configuration variables
│
├── main.tsx
└── vite-env.d.ts
```

---

## 2. Step-by-Step Setup Guide (Tailwind CSS v4 + Vite)

Installing Tailwind CSS as a Vite plugin is the most seamless way to integrate it with React and Vite.

### Step 01: Create your project
Start by creating a new Vite project using Create Vite (in `frontend/` directory):

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
```

### Step 02: Install Tailwind CSS & Core Dependencies
Install the latest `tailwindcss` and `@tailwindcss/vite` plugin along with core runtime utilities (`clsx`, `tailwind-merge`, `lucide-react`, `react-router-dom`):

```bash
npm install tailwindcss @tailwindcss/vite clsx tailwind-merge lucide-react react-router-dom
```

### Step 03: Configure the Vite Plugin
Add the `@tailwindcss/vite` plugin to your Vite configuration file (`vite.config.ts`):

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

### Step 04: Import Tailwind CSS
Add the `@import "tailwindcss";` directive directly into your CSS file (`src/styles/globals.css`):

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}
```

### Step 05: Include Compiled CSS in Entry Point
Ensure your compiled CSS is imported in `src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### Step 06: Start your build process
Run your build/development server:

```bash
npm run dev
```

### Step 07: Start using Tailwind in your UI
Use Tailwind's modern utility classes directly across all layout and feature components:

```tsx
<h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
  PeopleOS Dashboard
</h1>
```
