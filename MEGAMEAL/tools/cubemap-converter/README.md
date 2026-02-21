# Cubemap Converter

Converts equirectangular skybox images to 6 cube face images for optimal performance in MEGAMEAL.

## Usage

### Web Interface
1. Start the MEGAMEAL dev tools: `cd tools && node app.js`
2. Open http://localhost:3001
3. Click "🎆 Cubemap Conv" in the navigation
4. Select your equirectangular image
5. Choose resolution and format
6. Click "Convert to Cubemap"

### Command Line
```bash
node cubemap-converter.js <input-image> [options]

Options:
  --resolution=1024   Face resolution (512, 1024, 2048, 4096)
  --format=webp       Output format: webp|jpg|png
  --output=./         Output directory

Example:
  node cubemap-converter.js skybox.hdr --resolution=2048 --format=webp
```

## Supported Formats

**Input:** HDR, EXR, JPG, PNG, WebP
**Output:** WebP (recommended), PNG, JPG

## Output Files

Generates 6 cube face images:
- `px.format` - Positive X face (right)
- `nx.format` - Negative X face (left)
- `py.format` - Positive Y face (top)
- `ny.format` - Negative Y face (bottom)
- `pz.format` - Positive Z face (front)
- `nz.format` - Negative Z face (back)

## Integration with MEGAMEAL

Use the generated cubemap with the new Skybox component:

```javascript
<Skybox 
  path="/assets/hdri/my-skybox-cubemap/"
  files={['px.webp', 'nx.webp', 'py.webp', 'ny.webp', 'pz.webp', 'nz.webp']}
/>
```

## Performance Benefits

- **Faster loading** - No equirectangular decompression
- **Better memory** - GPU-native format
- **Smoother rendering** - No sphere mesh needed
- **Perfect reflections** - Ideal for environment mapping