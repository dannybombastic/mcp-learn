# MCP Learn Catalog Server - Deployment Guide 🚀

Complete deployment guide for the MCP Learn Catalog Server with both stdio and HTTP transports.

## 🌐 Deployment Options

### 1. Local Development (stdio)
- **Use case**: VS Code integration, local development
- **Transport**: stdio
- **Configuration**: Direct Node.js execution

### 2. HTTP Server (Production)
- **Use case**: n8n integration, remote access, web APIs
- **Transport**: HTTP over JSON-RPC 2.0
- **Configuration**: Express.js server with Docker support

## � HTTP Server Deployment

### Prerequisites
- Node.js >= 20.0.0
- Docker & Docker Compose (recommended)
- Domain with SSL certificate (for production)

### Environment Variables

```bash
# .env file
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://your-n8n-domain.com,http://localhost:3000
SESSION_TIMEOUT=3600000
```

### Docker Deployment (Recommended)

#### 1. Build and Deploy
```bash
# Clone repository
git clone <repository-url>
cd mcp-learn

# Build with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f mcp-learn-catalog
```

#### 2. Docker Compose Configuration
```yaml
version: '3.8'
services:
  mcp-learn-catalog:
    build: .
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - NODE_ENV=production
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      - ./logs:/app/logs
```

#### 3. Production Docker Setup
```bash
# Production environment
export ALLOWED_ORIGINS="https://your-domain.com,https://your-n8n.com"

# Deploy
docker-compose -f docker-compose.yml up -d

# Monitor
docker-compose ps
docker-compose logs -f
```

### Manual Deployment

#### 1. Direct Node.js
```bash
# Build
npm install
npm run build

# Start HTTP server
npm run start:http

# Or with PM2
npm install -g pm2
pm2 start dist/http-server.js --name mcp-learn-http
```

#### 2. Systemd Service (Linux)
```ini
# /etc/systemd/system/mcp-learn.service
[Unit]
Description=MCP Learn Catalog HTTP Server
After=network.target

[Service]
Type=simple
User=mcp-user
WorkingDirectory=/opt/mcp-learn
ExecStart=/usr/bin/node dist/http-server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable mcp-learn
sudo systemctl start mcp-learn
sudo systemctl status mcp-learn
```

## 🔒 Reverse Proxy Setup

### Nginx Configuration
```nginx
# /etc/nginx/sites-available/mcp-learn
server {
    listen 80;
    server_name mcp-learn-catalog.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mcp-learn-catalog.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/mcp-learn-catalog.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp-learn-catalog.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }

    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
```

### Traefik Configuration (Docker)
```yaml
# docker-compose.yml with Traefik
version: '3.8'
services:
  mcp-learn-catalog:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.mcp-learn.rule=Host(`mcp-learn-catalog.your-domain.com`)"
      - "traefik.http.routers.mcp-learn.tls=true"
      - "traefik.http.routers.mcp-learn.tls.certresolver=letsencrypt"
      - "traefik.http.services.mcp-learn.loadbalancer.server.port=3001"
    networks:
      - traefik

networks:
  traefik:
    external: true
```

## 🧪 Testing Deployment

### Health Check
```bash
# Basic health check
curl https://mcp-learn-catalog.devspn.tech/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-10-31T...",
  "version": "1.1.0",
  "protocol": "2025-06-18"
}
```

### MCP Protocol Test
```bash
# Initialize session
curl -X POST https://mcp-learn-catalog.devspn.tech/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "clientInfo": {"name": "test", "version": "1.0.0"},
      "capabilities": {}
    }
  }'

# Use the session ID from response in next requests
curl -X POST https://mcp-learn-catalog.devspn.tech/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "searchCatalog",
      "arguments": {"q": "Azure", "max_results": 2}
    }
  }'
```

## 🎯 Integration Examples

### n8n Integration

#### 1. HTTP Request Node - Initialize
```javascript
// Method: POST
// URL: https://mcp-learn-catalog.devspn.tech/mcp
// Headers:
{
  "Content-Type": "application/json",
  "Accept": "application/json"
}

// Body:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "clientInfo": {"name": "n8n", "version": "1.0.0"},
    "capabilities": {}
  }
}
```

#### 2. HTTP Request Node - Call Tools
```javascript
// Method: POST
// URL: https://mcp-learn-catalog.devspn.tech/mcp
// Headers:
{
  "Content-Type": "application/json",
  "Mcp-Session-Id": "{{$json.result.sessionId}}"
}

// Body:
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "searchCatalog",
    "arguments": {
      "q": "{{$json.searchTerm}}",
      "type": "modules",
      "max_results": 5
    }
  }
}
```

### VS Code Integration

#### MCP Configuration
```json
// ~/.config/Code/User/mcp.json
{
  "mcpServers": {
    "learn-catalog-local": {
      "command": "node",
      "args": ["/path/to/mcp-learn/dist/server.js"],
      "description": "Local stdio server"
    },
    "learn-catalog-remote": {
      "transport": {
        "type": "http",
        "uri": "https://mcp-learn-catalog.devspn.tech/mcp"
      },
      "description": "Remote HTTP server"
    }
  }
}
```

## � Monitoring & Maintenance

### Logs
```bash
# Docker logs
docker-compose logs -f mcp-learn-catalog

# Systemd logs
sudo journalctl -u mcp-learn -f

# Application logs
tail -f /opt/mcp-learn/logs/application.log
```

### Health Monitoring
```bash
# Simple monitoring script
#!/bin/bash
while true; do
  if curl -f -s https://mcp-learn-catalog.devspn.tech/health > /dev/null; then
    echo "$(date): Server is healthy"
  else
    echo "$(date): Server is down!"
    # Add notification logic here
  fi
  sleep 60
done
```

### Resource Monitoring
```bash
# Check container resources
docker stats mcp-learn-catalog

# Check system resources
htop
df -h
free -h
```

## 🔧 Troubleshooting

### Common Issues

#### CORS Errors
```bash
# Check ALLOWED_ORIGINS environment variable
docker-compose exec mcp-learn-catalog env | grep ALLOWED_ORIGINS

# Update CORS configuration
# Edit .env file and restart container
docker-compose restart mcp-learn-catalog
```

#### Session Issues
```bash
# Check session management
curl https://mcp-learn-catalog.devspn.tech/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","clientInfo":{"name":"test","version":"1.0.0"},"capabilities":{}}}'

# Look for Mcp-Session-Id in response headers
```

#### Performance Issues
```bash
# Check container logs for memory/CPU issues
docker-compose logs mcp-learn-catalog

# Monitor resource usage
docker stats mcp-learn-catalog

# Scale if needed (multiple instances)
docker-compose up -d --scale mcp-learn-catalog=3
```

### Debug Mode
```bash
# Enable debug logging
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up -d

# Or set environment variable
export DEBUG=mcp:*
npm run start:http
```

## � Production Deployment Checklist

### Pre-deployment
- [ ] Domain configured with SSL certificate
- [ ] Environment variables set
- [ ] CORS origins configured
- [ ] Reverse proxy configured
- [ ] Monitoring set up

### Deployment
- [ ] Build Docker image
- [ ] Deploy container
- [ ] Verify health endpoint
- [ ] Test MCP protocol
- [ ] Test all 4 tools
- [ ] Verify CORS functionality

### Post-deployment
- [ ] Monitor logs
- [ ] Set up alerts
- [ ] Test integrations (n8n, VS Code)
- [ ] Document access URLs
- [ ] Create backup procedures

## 📞 Support

### Live Server
- **URL**: https://mcp-learn-catalog.devspn.tech/
- **Health**: https://mcp-learn-catalog.devspn.tech/health
- **Status**: ✅ Active and tested

### Contact
- Create issues in the repository
- Check logs for troubleshooting
- Review configuration files

---

**Ready for production deployment! 🎉**