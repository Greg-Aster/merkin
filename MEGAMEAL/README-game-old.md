# 🌊 MEGAMEAL
## Immersive First-Person 3D Web Game

[![Built with Threlte](https://img.shields.io/badge/Built%20with-Threlte-blue)](https://threlte.xyz)
[![Svelte 5](https://img.shields.io/badge/Svelte-5-orange)](https://svelte.dev)
[![Physics](https://img.shields.io/badge/Physics-Rapier3D-green)](https://rapier.rs)
[![Demo](https://img.shields.io/badge/🎮-Play%20Demo-brightgreen)](https://your-demo-url.com)

> A cutting-edge first-person exploration game featuring underwater effects, dynamic environments, and modern web architecture.

---

## ✨ Features

### 🎮 **Immersive Gameplay**
- **First-Person Movement** - WASD + mouse look controls with realistic physics
- **Underwater Exploration** - Dynamic ocean system with murky water effects and rising water levels
- **Timeline Navigation** - Interactive star map system for exploring different time periods
- **Multiple Environments** - Observatory, spaceship, restaurant, infinite library, and personal rooms

### 🌊 **Advanced Underwater System**
- **Dynamic Water Levels** - Ocean rises from -6 to 8 units over time
- **Realistic Collision Detection** - Optimized system that detects when you're actually underwater
- **Murky Water Effects** - Configurable fog density limits visibility underwater
- **Screen Effects** - Dark vignette overlay creates authentic underwater atmosphere

### 📱 **Cross-Platform Support**
- **Desktop Controls** - Full WASD + mouse look + jump controls
- **Mobile Optimized** - Touch controls with virtual joystick and drag-to-look
- **Responsive Design** - Automatically adapts to different screen sizes
- **Performance Scaling** - Quality adjusts based on device capabilities

### ⚡ **Modern Web Architecture**
- **Component-Based** - Built with reusable Svelte 5 components
- **No Legacy Dependencies** - Modern TypeScript props instead of JSON configs
- **Reactive State Management** - Real-time updates using Svelte stores
- **Performance Optimized** - LOD system, collision optimization, mobile adaptations

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/MEGAMEAL.git
cd MEGAMEAL

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Play the Game
1. Open your browser to `http://localhost:4321`
2. Navigate to the game page
3. Use WASD to move, mouse to look around
4. Jump with Spacebar, explore the underwater environment!

---

## 🎯 Game Levels

### 🔭 **Observatory** 
*Main hub with interactive star map and underwater exploration*
- Interactive star constellation system
- Dynamic ocean with configurable murky water effects
- Timeline navigation through star selection
- Rising water levels create time pressure

### 🚀 **Miranda Spaceship**
*Futuristic spaceship environment*
- Advanced ship systems and terminals
- Debris analysis and exploration
- Sci-fi atmosphere with detailed corridors

### 🍽️ **Restaurant**
*Kitchen/restaurant back-room environment*
- Interactive kitchen equipment
- Hidden passages and secrets to discover
- Realistic restaurant atmosphere

### 📚 **Infinite Library**
*Endless library with knowledge systems*
- Towering bookshelves to explore
- Knowledge access terminals
- Portal system for interdimensional travel

### 🏠 **Jerry's Room**
*Personal workspace environment*
- Multiple computer screens and desk setup
- Personal items and interactive objects
- Cozy room atmosphere

---

## 🛠️ Technical Details

### Built With
- **[Threlte](https://threlte.xyz)** - Declarative 3D framework for Svelte
- **[Svelte 5](https://svelte.dev)** - Reactive component framework
- **[Rapier3D](https://rapier.rs)** - High-performance physics engine
- **[Three.js](https://threejs.org)** - 3D graphics library (via Threlte)
- **[Astro](https://astro.build)** - Static site generator

### Architecture Highlights
```typescript
// Modern component-based ocean system
<OceanComponent 
  enableRising={true}
  initialLevel={-6}
  targetLevel={8}
  underwaterFogDensity={0.62}
  on:waterEnter={(e) => handleUnderwaterEffects(e.detail.depth)}
/>
```

### Performance Features
- **Optimized Collision Detection** - Runs at 6fps instead of 60fps (10x performance improvement)
- **LOD System** - Automatic level-of-detail adjustments
- **Mobile Optimizations** - Reduced quality settings for mobile devices
- **Reactive Updates** - Only re-renders when necessary

---

## 🎮 Controls

### Desktop
| Key | Action |
|-----|--------|
| `W A S D` | Movement |
| `Mouse` | Look around (click + drag) |
| `Spacebar` | Jump |
| `Shift` | Sprint |
| `Click` | Interact with objects |

### Mobile
- **Virtual Joystick** - Bottom area for movement
- **Touch & Drag** - Upper area for looking around
- **Tap** - Interact with objects
- **Jump Button** - On-screen jump control

---

## 🌊 Underwater System Configuration

Each level can customize its underwater experience:

```typescript
const levelConfig = {
  water: {
    underwaterFogDensity: 0.62,    // Higher = murkier water
    underwaterFogColor: 0x081520,  // Dark blue-gray fog
    initialLevel: -6,              // Starting water level
    targetLevel: 8,                // Final water level
    riseRate: 0.05                 // How fast water rises
  }
}
```

### Fog Density Guide
- `0.03` - Light murk (good visibility)
- `0.08` - Medium murk
- `0.12` - Heavy murk (limited visibility)
- `0.62` - **Very murky** (current Observatory setting)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Fork the repository
# Clone your fork
git clone https://github.com/yourusername/MEGAMEAL.git

# Create a feature branch
git checkout -b feature/amazing-feature

# Make your changes and commit
git commit -m "Add amazing feature"

# Push to your fork and submit a pull request
```

---

## 📊 Performance

- **Load Time**: ~2-3 seconds
- **Target FPS**: 60 FPS with automatic quality adjustment
- **Mobile Support**: Optimized for mobile devices
- **Memory Usage**: Efficient with LOD and culling systems

---

## 🐛 Known Issues & Roadmap

### Current Issues
- Underwater particle effects integration in progress
- Mobile touch sensitivity fine-tuning needed

### Planned Features
- [ ] Additional underwater creatures and effects
- [ ] Save system for game progress
- [ ] Multiplayer exploration mode
- [ ] VR support investigation
- [ ] Additional level environments

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Threlte Team** - For the amazing declarative 3D framework
- **Svelte Team** - For the reactive component system
- **Rapier3D** - For high-performance physics
- **Three.js Community** - For the foundational 3D graphics

---

## 🔗 Links

- **[Live Demo](https://megameal.org)** - Play the game online
- **[Game Design Document](GAME_DESIGN_DOCUMENT.md)** - Detailed technical documentation
- **[Issues](https://github.com/yourusername/MEGAMEAL/issues)** - Report bugs or request features
- **[Discussions](https://github.com/yourusername/MEGAMEAL/discussions)** - Community discussions

---

<p align="center">
  <strong>🌊 Dive into MEGAMEAL - Where Modern Web Meets Immersive Gaming 🌊</strong>
</p>