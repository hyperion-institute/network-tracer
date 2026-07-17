# Network Tracer

A website that lets users track the route their network traffic takes when pinging/tracerouting a target, and visualizes each hop on a map.

![status](https://img.shields.io/badge/status-in%20development-yellow)
![license](https://img.shields.io/badge/license-MIT-blue)

## Demo

> _(add a demo link or screenshot here)_

## Features

- Enter a domain or IP and run a real traceroute from the server
- Stream each hop in real time (via SSE)
- Geolocate each hop's IP and plot the route on a world map
- Detailed table: IP, hostname (rDNS), latency (ms), ASN/ISP for each hop
- Rate limiting and input validation to prevent abuse as a network scanning tool

## Architecture

```
Browser (frontend) --HTTP/SSE--> Backend API --child_process--> traceroute/mtr
                                        |
                                        +--> GeoIP lookup (MaxMind/ip-api)
                                        +--> Redis cache
```

Browsers don't have raw socket access, so they can't run traceroute themselves — the backend is responsible for running the system command and streaming each hop's result back to the frontend in real time.

## Project structure

```
network-tracer/
├── frontend/                 # Web app (React/Vue/Svelte)
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapView.jsx       # Map showing the route across hops
│   │   │   ├── HopTable.jsx      # Table listing IP, latency, ASN per hop
│   │   │   └── SearchBox.jsx     # Input for the domain/IP to trace
│   │   ├── hooks/
│   │   │   └── useTraceStream.js # Consumes data via SSE/WebSocket
│   │   └── App.jsx
│   └── package.json
│
├── backend/                  # API + traceroute engine
│   ├── src/
│   │   ├── routes/
│   │   │   └── trace.js          # POST /api/trace -> streams results
│   │   ├── services/
│   │   │   ├── traceroute.js     # Wraps the traceroute/mtr command
│   │   │   ├── geoip.js          # IP location lookup (with caching)
│   │   │   └── asn.js            # ASN/ISP lookup (optional)
│   │   ├── middleware/
│   │   │   ├── rateLimit.js
│   │   │   └── validateTarget.js # Blocks private IPs, validates domains
│   │   └── server.js
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
├── .env.example
├── docs/
│   └── ARCHITECTURE.md
└── README.md
```

## Tech stack

| Component     | Choice                                 |
|---------------|------------------------------------------|
| Frontend      | React + Leaflet.js (or Mapbox GL)      |
| Backend       | Node.js (Express/Fastify) or Python (FastAPI) |
| Realtime      | Server-Sent Events (SSE)               |
| GeoIP         | MaxMind GeoLite2 / ip-api.com          |
| Cache         | Redis                                  |
| Deployment    | Docker (requires `NET_RAW` capability) |

## Getting started

```bash
# Clone the repo
git clone https://github.com/<username>/network-tracer.git
cd network-tracer

# Copy the example env file
cp .env.example .env

# Run the full stack with Docker Compose
docker-compose up --build
```

Visit `http://localhost:3000` to use it.

### Running manually (without Docker)

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

> **Note:** the `traceroute` command needs raw socket access. On Linux, run it with `sudo` or grant the `NET_RAW`/`NET_ADMIN` capability to the container/process. You can also use `mtr` in TCP mode to avoid needing root.

## API

### `POST /api/trace`

Body:
```json
{ "target": "example.com" }
```

Response: an SSE stream, one event per hop:
```json
{ "hop": 3, "ip": "203.0.113.1", "hostname": "203-0-113-1.isp.net", "rtt": 24.5, "location": { "lat": 10.8, "lng": 106.6, "city": "Ho Chi Minh City" } }
```

## Security

- Block tracing to private/internal IPs (10.x, 172.16.x, 192.168.x, 127.0.0.1, ...) to prevent SSRF
- Rate-limit by user IP to prevent abuse as a scanning/DDoS reflection tool
- Validate domain/IP input format before passing it into any shell command (to prevent command injection)

## Roadmap

- [ ] Basic traceroute + hop table display
- [ ] Plot the route on a map
- [ ] Real-time result streaming
- [ ] ASN/ISP lookup per hop
- [ ] Redis-based GeoIP caching
- [ ] Request rate limiting / abuse prevention
- [ ] Trace history (optional, requires an account)

## Contributing

Pull requests and issues are welcome. Please open an issue before making large changes.

## License

[MIT](LICENSE)
