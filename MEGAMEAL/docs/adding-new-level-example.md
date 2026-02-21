# Adding a New Level - Example

This example shows how easy it is to add a new level using the new streamlined system.

## Before: Adding "The Cosmic Garden" (OLD WAY - 5 files to modify)

### Step 1: Create level JSON
Create `cosmic_garden.json` in `/src/game/levels/`

### Step 2: Modify GameManager.ts (required)
Add to `registerMigratedLevels()`:
```typescript
this.levelManager.registerLevel('cosmic_garden', this.createDataDrivenLevel);
```

### Step 3: Modify GameManager.ts again (required)
Add to `loadTimelineEvents()`:
```typescript
{
  id: "cosmic-garden-level",
  title: "The Cosmic Garden",
  // ... 20 more lines of hardcoded data
}
```

### Step 4: Modify GameManager.ts yet again (required)
Add to `updateCameraForLevel()`:
```typescript
case 'cosmic_garden':
  camera.position.set(0, 2, 10);
  camera.lookAt(0, 2, 0);
  break;
```

### Step 5: Modify LevelSystem.ts (required)
Add to `initializeDefaultComponents()`:
```typescript
try {
  const { CosmicGardenSystem } = await import('./CosmicGardenSystem');
  this.registerComponent('CosmicGardenSystem', CosmicGardenSystem);
} catch (error) {
  console.warn('Failed to register CosmicGardenSystem:', error);
}
```

### Step 6: Modify GenericLevel.ts (possibly required)
If your component needs a special constructor, add to `createSystem()`:
```typescript
} else if (systemConfig.type === 'CosmicGardenSystem') {
  component = new componentClass(/* special constructor args */);
```

**Total: 5 files modified, ~50 lines of code changes**

---

## After: Adding "The Cosmic Garden" (NEW WAY - 2 files to create)

### Step 1: Create level JSON
Create `cosmic_garden.json` in `/src/game/levels/`

### Step 2: Add to manifest
Add to `level-manifest.json`:
```json
"cosmic_garden": {
  "name": "The Cosmic Garden",
  "configPath": "./cosmic_garden.json",
  "camera": {
    "initialPosition": [0, 2, 10],
    "lookAt": [0, 2, 0]
  },
  "timelineEvent": {
    "id": "cosmic-garden-level",
    "title": "The Cosmic Garden",
    "description": "A serene garden floating in the cosmos.",
    "year": 25000,
    "era": "golden-age",
    "location": "The Cosmic Garden",
    "isKeyEvent": true,
    "isLevel": true,
    "tags": ["Level", "Garden", "Peaceful"],
    "category": "GAME_LEVEL",
    "unlocked": true
  }
}
```

### Step 3: Create component (using standardized interface)
Create `CosmicGardenSystem.ts` that extends `BaseLevelGenerator`:
```typescript
import { BaseLevelGenerator, type LevelGeneratorDependencies } from '../interfaces/ILevelGenerator';

export class CosmicGardenSystem extends BaseLevelGenerator {
  constructor(dependencies: LevelGeneratorDependencies) {
    super(dependencies);
  }

  async initialize(config: any): Promise<void> {
    // Create your garden here
    // All dependencies are available via this.dependencies
  }

  update(deltaTime: number): void {
    // Update logic here
  }

  dispose(): void {
    // Cleanup here
  }
}
```

**Total: 2 files created, ~30 lines of code**

---

## Key Benefits

1. **No core engine files modified** - GameManager, LevelSystem, GenericLevel remain untouched
2. **Centralized configuration** - All level data in one manifest file
3. **Standardized components** - All generators use the same interface
4. **Automatic registration** - Components are discovered and registered automatically
5. **Type safety** - Standardized interface ensures consistent API

## Migration Path

Existing levels continue to work unchanged. New levels can use the improved system immediately. Legacy components are supported through the compatibility layer in GenericLevel.