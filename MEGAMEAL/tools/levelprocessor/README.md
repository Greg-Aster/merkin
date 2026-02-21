# Level Processor Module

A development tool for processing large GLB terrain models into optimized chunks with multiple levels of detail (LODs) for improved performance in Threlte games.

## Files

- **`index.ts`** - Main module exports
- **`types.ts`** - TypeScript type definitions
- **`level-processor.ts`** - Core processing logic
- **`LevelProcessor.svelte`** - UI component for the tool

## Usage

### API Endpoint
The tool is accessible via `/api/process-level` and accepts the following parameters:

```typescript
{
  inputFile: string;     // Path to input GLB file (relative to project root)
  outputDir: string;     // Output directory path
  gridX: number;         // Number of chunks along X axis (1-32)
  gridY: number;         // Number of chunks along Y axis (1-32)
  lodLevels: number;     // Number of LOD levels to generate (0-10)
}
```

### Web Interface
Access the tool at `/tools/level-processor` during development.

## Output Structure

For an input file `observatory-island.glb`, the tool creates:

```
outputDir/
└── observatory-island/
    ├── chunk_0_0_LOD0.glb
    ├── chunk_0_0_LOD1.glb
    ├── chunk_0_0_LOD2.glb
    ├── chunk_0_1_LOD0.glb
    └── ... (and so on)
```

## Features

- **Spatial Chunking**: Divides large terrain into manageable grid chunks
- **LOD Generation**: Creates multiple detail levels with automatic polygon reduction
- **TypeScript Support**: Fully typed with comprehensive error handling
- **Organized Output**: Creates model-specific subfolders for better organization
- **Progress Logging**: Real-time feedback during processing
- **Validation**: Input parameter validation and error reporting

## Development Only

This tool is only available during development (`NODE_ENV !== 'production`) and will return 404 in production builds.