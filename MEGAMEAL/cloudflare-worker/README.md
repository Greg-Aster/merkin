# MEGAMEAL Room Directory Service

A Cloudflare Worker that provides a room name directory for MEGAMEAL multiplayer sessions.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create KV Namespace:**
   - Go to your Cloudflare dashboard
   - Navigate to Workers & Pages > KV
   - Create a new namespace named `MEGAMEAL_ROOMS`
   - Copy the Namespace ID

3. **Configure wrangler.toml:**
   - Replace `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` in `wrangler.toml` with your actual Namespace ID

4. **Deploy:**
   ```bash
   npm run deploy
   ```

5. **Test locally:**
   ```bash
   npm run dev
   ```

## API Endpoints

### Register a Room
```
POST /register
Content-Type: application/json

{
  "roomName": "my-game-room",
  "hostId": "peer-js-host-id"
}
```

### Look up a Room
```
GET /lookup/{roomName}
```

Returns:
```json
{
  "roomName": "my-game-room",
  "hostId": "peer-js-host-id"
}
```

## Features

- **Automatic Cleanup**: Rooms expire after 6 hours
- **Case Insensitive**: Room names are stored in lowercase
- **CORS Enabled**: Works with web applications
- **Simple API**: Easy integration with game clients