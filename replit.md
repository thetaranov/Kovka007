# Carport Configurator

## Project Overview
A 3D interactive carport configurator built with React, TypeScript, Three.js, and Tailwind CSS. This application allows users to customize carport designs in real-time with a 3D preview.

## Technology Stack
- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **3D Graphics**: Three.js with React Three Fiber (@react-three/fiber, @react-three/drei)
- **Styling**: Tailwind CSS v4 with PostCSS
- **Icons**: Lucide React

## Project Structure
- `components/` - React components for the 3D scene, controls, and modals
  - `Scene.tsx` - 3D scene with Three.js
  - `Controls.tsx` - Configuration controls
  - `CarportModel.tsx` - 3D carport model
  - `OrderModal.tsx` - Order placement modal
- `App.tsx` - Main application component
- `index.tsx` - Application entry point
- `types.ts` - TypeScript type definitions
- `constants.tsx` - Application constants and pricing data

## Setup and Configuration

### Development
- **Server**: Vite dev server on port 5000
- **Host**: 0.0.0.0 (configured for Replit environment)
- **HMR**: Configured for port 5000

### Key Configuration Files
- `vite.config.ts` - Vite configuration with Replit-specific settings
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS with Tailwind v4 plugin
- `tsconfig.json` - TypeScript configuration

## Running the Application

### Development
```bash
npm run dev
```
The application runs on `http://0.0.0.0:5000`

### Build
```bash
npm run build
```

### Preview
```bash
npm run preview
```

## Deployment
Configured for Replit Autoscale deployment:
- Build command: `npm run build`
- Run command: `npx vite preview --host 0.0.0.0 --port 5000`

## Features
- Interactive 3D carport visualization
- Real-time configuration updates
- Multiple roof types (flat, gable, arched, semi-arched)
- Customizable dimensions, colors, and materials
- Pricing calculator with dynamic updates
- Telegram WebApp integration
- Mobile-responsive design

## Recent Changes (December 2, 2025)
- Configured for Replit environment
- Set up Vite to run on port 5000 with 0.0.0.0 host
- Installed Tailwind CSS v4 with @tailwindcss/postcss plugin
- Fixed PostCSS configuration for Tailwind v4
- Updated content paths in tailwind.config.js
- Configured deployment settings for Replit Autoscale
