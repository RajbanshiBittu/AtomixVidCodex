# 🐳 Docker Production Deployment Guide
## Atomix-VidCodex - Video Conversion Platform

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Build Commands](#build-commands)
4. [Push Commands](#push-commands)
5. [Run Commands](#run-commands)
6. [Environment Variables](#environment-variables)
7. [Security Checklist](#security-checklist)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This guide provides production-ready Docker commands for deploying the Atomix-VidCodex platform with strict security and best practices:

✅ **Multi-stage builds** - Minimal runtime images  
✅ **Non-root user** - Containers run as `nodejs`/`nextjs` user  
✅ **Immutable tags** - No `latest` tags  
✅ **Zero secrets** - All secrets injected at runtime  
✅ **Environment-driven** - No hardcoded values  
✅ **Structured logging** - JSON logs to stdout/stderr  
✅ **Health checks** - Built-in container health monitoring  

---

## 📦 Prerequisites

- Docker >= 20.10.0
- Docker registry access (Docker Hub, AWS ECR, GCP GCR, Azure ACR)
- Set your registry URL: `export REGISTRY=your-registry.io/your-org`

```bash
# Example for Docker Hub
export REGISTRY=docker.io/yourusername

# Example for AWS ECR
export REGISTRY=123456789012.dkr.ecr.us-east-1.amazonaws.com

# Example for GCP GCR
export REGISTRY=gcr.io/your-project-id

# Example for Azure ACR
export REGISTRY=yourregistry.azurecr.io
```

---

## 🔨 Build Commands

### Backend Build

```bash
# Set version tag (REQUIRED - never use 'latest')
export VERSION=1.0.0

# Build backend image
docker build \
  --file backend/Dockerfile.backend \
  --tag ${REGISTRY}/atomix-vidcodex-backend:${VERSION} \
  --tag ${REGISTRY}/atomix-vidcodex-backend:$(git rev-parse --short HEAD) \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VCS_REF=$(git rev-parse --short HEAD) \
  --no-cache \
  backend/

# Verify image
docker images ${REGISTRY}/atomix-vidcodex-backend:${VERSION}
```

### Frontend Build

```bash
# Set version tag (REQUIRED - never use 'latest')
export VERSION=1.0.0

# Build frontend image
docker build \
  --file frontend/Dockerfile.frontend \
  --tag ${REGISTRY}/atomix-vidcodex-frontend:${VERSION} \
  --tag ${REGISTRY}/atomix-vidcodex-frontend:$(git rev-parse --short HEAD) \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VCS_REF=$(git rev-parse --short HEAD) \
  --build-arg NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
  --no-cache \
  frontend/

# Verify image
docker images ${REGISTRY}/atomix-vidcodex-frontend:${VERSION}
```

### Security Scan (Recommended)

```bash
# Scan for vulnerabilities before pushing
docker scan ${REGISTRY}/atomix-vidcodex-backend:${VERSION}
docker scan ${REGISTRY}/atomix-vidcodex-frontend:${VERSION}

# Alternative: Use Trivy
trivy image ${REGISTRY}/atomix-vidcodex-backend:${VERSION}
trivy image ${REGISTRY}/atomix-vidcodex-frontend:${VERSION}
```

---

## 📤 Push Commands

### Push to Registry

```bash
# Login to your registry
docker login ${REGISTRY}

# Push backend image with version tag
docker push ${REGISTRY}/atomix-vidcodex-backend:${VERSION}
docker push ${REGISTRY}/atomix-vidcodex-backend:$(git rev-parse --short HEAD)

# Push frontend image with version tag
docker push ${REGISTRY}/atomix-vidcodex-frontend:${VERSION}
docker push ${REGISTRY}/atomix-vidcodex-frontend:$(git rev-parse --short HEAD)
```

### Verify Push

```bash
# List remote tags
docker search ${REGISTRY}/atomix-vidcodex-backend
docker search ${REGISTRY}/atomix-vidcodex-frontend
```

---

## 🚀 Run Commands

### Backend Container

```bash
# Production run command with all environment variables
docker run -d \
  --name atomix-backend \
  --restart unless-stopped \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \
  --tmpfs /app/uploads:rw,noexec,nosuid,size=500m \
  --tmpfs /app/outputs:rw,noexec,nosuid,size=2g \
  -p 8080:8080 \
  -e PORT=8080 \
  -e HOST=0.0.0.0 \
  -e NODE_ENV=production \
  -e MAX_FILE_SIZE=524288000 \
  -e RATE_LIMIT_WINDOW_MS=900000 \
  -e RATE_LIMIT_MAX_REQUESTS=100 \
  -e AUTO_CLEANUP_ENABLED=true \
  -e CLEANUP_INTERVAL_HOURS=6 \
  -e CLEANUP_AGE_HOURS=24 \
  -e ALLOWED_ORIGINS=https://atomixtools.com,https://www.atomixtools.com \
  -e LOG_LEVEL=info \
  --memory=4g \
  --cpus=2 \
  --health-cmd="node -e \"require('http').get('http://localhost:8080/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\"" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  ${REGISTRY}/atomix-vidcodex-backend:${VERSION}
```

### Frontend Container

```bash
# Production run command with all environment variables
docker run -d \
  --name atomix-frontend \
  --restart unless-stopped \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \
  --tmpfs /app/.next/cache:rw,noexec,nosuid,size=200m \
  -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_API_URL=https://api.atomixtools.com \
  -e NEXT_TELEMETRY_DISABLED=1 \
  --memory=2g \
  --cpus=1 \
  --health-cmd="node -e \"require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\"" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  ${REGISTRY}/atomix-vidcodex-frontend:${VERSION}
```

### Development/Testing Run (Less Restrictive)

```bash
# Backend - Development mode
docker run -d \
  --name atomix-backend-dev \
  -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=development \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  -v $(pwd)/backend/uploads:/app/uploads \
  -v $(pwd)/backend/outputs:/app/outputs \
  ${REGISTRY}/atomix-vidcodex-backend:${VERSION}

# Frontend - Development mode
docker run -d \
  --name atomix-frontend-dev \
  -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=development \
  -e NEXT_PUBLIC_API_URL=http://localhost:8080 \
  ${REGISTRY}/atomix-vidcodex-frontend:${VERSION}
```

### Docker Compose (Production)

Create `docker-compose.production.yml`:

```yaml
version: '3.9'

services:
  backend:
    image: ${REGISTRY}/atomix-vidcodex-backend:${VERSION}
    container_name: atomix-backend
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=100m
      - /app/uploads:rw,noexec,nosuid,size=500m
      - /app/outputs:rw,noexec,nosuid,size=2g
    ports:
      - "8080:8080"
    environment:
      PORT: 8080
      HOST: 0.0.0.0
      NODE_ENV: production
      MAX_FILE_SIZE: 524288000
      RATE_LIMIT_WINDOW_MS: 900000
      RATE_LIMIT_MAX_REQUESTS: 100
      AUTO_CLEANUP_ENABLED: "true"
      CLEANUP_INTERVAL_HOURS: 6
      CLEANUP_AGE_HOURS: 24
      ALLOWED_ORIGINS: https://atomixtools.com,https://www.atomixtools.com
      LOG_LEVEL: info
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8080/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - atomix-network

  frontend:
    image: ${REGISTRY}/atomix-vidcodex-frontend:${VERSION}
    container_name: atomix-frontend
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=100m
      - /app/.next/cache:rw,noexec,nosuid,size=200m
    ports:
      - "3000:3000"
    environment:
      PORT: 3000
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://api.atomixtools.com
      NEXT_TELEMETRY_DISABLED: 1
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - atomix-network
    depends_on:
      backend:
        condition: service_healthy

networks:
  atomix-network:
    driver: bridge

```

Run with:
```bash
export REGISTRY=your-registry.io/your-org
export VERSION=1.0.0
docker-compose -f docker-compose.production.yml up -d
```

---

## 🔐 Environment Variables

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `8080` | Server listen port |
| `HOST` | No | `0.0.0.0` | Server bind address (MUST be 0.0.0.0 in containers) |
| `NODE_ENV` | Yes | - | `production` or `development` |
| `MAX_FILE_SIZE` | No | `1073741824` | Max upload size in bytes (1GB default) |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15min default) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |
| `AUTO_CLEANUP_ENABLED` | No | `false` | Enable automatic file cleanup |
| `CLEANUP_INTERVAL_HOURS` | No | `6` | Cleanup check interval |
| `CLEANUP_AGE_HOURS` | No | `24` | Delete files older than this |
| `ALLOWED_ORIGINS` | Yes | - | Comma-separated CORS origins |
| `LOG_LEVEL` | No | `info` | Logging level: error, warn, info, debug |

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Server listen port |
| `NODE_ENV` | Yes | - | `production` or `development` |
| `NEXT_PUBLIC_API_URL` | Yes | - | Backend API URL (must be NEXT_PUBLIC_ prefixed) |
| `NEXT_TELEMETRY_DISABLED` | No | `1` | Disable Next.js telemetry |

### Secrets Management

**❌ NEVER do this:**
```bash
# DO NOT bake secrets into images
docker build --build-arg API_KEY=secret123 ...
```

**✅ Always do this:**
```bash
# Inject secrets at runtime
docker run -e API_KEY=${API_KEY} ...

# Or use Docker secrets (Swarm mode)
docker secret create api_key ./api_key.txt
docker service create --secret api_key ...

# Or use Kubernetes secrets
kubectl create secret generic api-keys --from-literal=API_KEY=secret123
```

---

## 🔒 Security Checklist

Before deploying to production, verify:

- [ ] ✅ Images tagged with version numbers (no `latest`)
- [ ] ✅ Containers run as non-root user (nodejs/nextjs)
- [ ] ✅ No secrets in Docker images or environment variables
- [ ] ✅ Read-only root filesystem enabled (`--read-only`)
- [ ] ✅ Temporary filesystems for writable directories (`--tmpfs`)
- [ ] ✅ Resource limits set (`--memory`, `--cpus`)
- [ ] ✅ Health checks configured
- [ ] ✅ CORS properly configured for production domain
- [ ] ✅ All logs go to stdout/stderr (no file logging)
- [ ] ✅ Images scanned for vulnerabilities
- [ ] ✅ All environment variables externalized
- [ ] ✅ PORT binding to 0.0.0.0
- [ ] ✅ Restart policy set (`--restart unless-stopped`)

---

## 🐛 Troubleshooting

### View Logs

```bash
# Backend logs (structured JSON)
docker logs -f atomix-backend

# Frontend logs
docker logs -f atomix-frontend

# Follow logs with timestamps
docker logs -f --timestamps atomix-backend
```

### Check Health Status

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' atomix-backend
docker inspect --format='{{.State.Health.Status}}' atomix-frontend

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' atomix-backend
```

### Debug Container

```bash
# Execute shell inside running container (as non-root user)
docker exec -it atomix-backend sh

# Check running processes
docker top atomix-backend

# View resource usage
docker stats atomix-backend atomix-frontend
```

### Common Issues

**Issue: Container exits immediately**
```bash
# Check logs for errors
docker logs atomix-backend

# Run interactively to debug
docker run -it --rm ${REGISTRY}/atomix-vidcodex-backend:${VERSION} sh
```

**Issue: Permission denied errors**
```bash
# Verify non-root user is set
docker inspect ${REGISTRY}/atomix-vidcodex-backend:${VERSION} | grep User

# Should output: "User": "nodejs" or "User": "1001"
```

**Issue: CORS errors in production**
```bash
# Verify ALLOWED_ORIGINS is set correctly
docker exec atomix-backend env | grep ALLOWED_ORIGINS

# Should include your production domain
```

**Issue: Frontend can't connect to backend**
```bash
# Verify NEXT_PUBLIC_API_URL
docker exec atomix-frontend env | grep NEXT_PUBLIC_API_URL

# Test connectivity from frontend to backend
docker exec atomix-frontend wget -O- http://backend:8080/
```

---

## 📊 Monitoring

### Prometheus Metrics (Optional Enhancement)

Add to backend `package.json`:
```json
{
  "dependencies": {
    "prom-client": "^14.2.0"
  }
}
```

Expose metrics endpoint at `/metrics` for Prometheus scraping.

### Log Aggregation

Logs are already in JSON format on stdout/stderr. Use:

- **Fluentd** - Forward logs to Elasticsearch
- **Loki** - Grafana's log aggregation
- **CloudWatch** - AWS log aggregation
- **Stackdriver** - GCP log aggregation

Example Docker log driver:
```bash
docker run \
  --log-driver=fluentd \
  --log-opt fluentd-address=localhost:24224 \
  --log-opt tag="atomix.backend" \
  ${REGISTRY}/atomix-vidcodex-backend:${VERSION}
```

---

## 🚀 Quick Start (TL;DR)

```bash
# 1. Set variables
export REGISTRY=docker.io/yourusername
export VERSION=1.0.0

# 2. Build images
docker build -f backend/Dockerfile.backend -t ${REGISTRY}/atomix-vidcodex-backend:${VERSION} backend/
docker build -f frontend/Dockerfile.frontend -t ${REGISTRY}/atomix-vidcodex-frontend:${VERSION} frontend/

# 3. Push to registry
docker push ${REGISTRY}/atomix-vidcodex-backend:${VERSION}
docker push ${REGISTRY}/atomix-vidcodex-frontend:${VERSION}

# 4. Deploy with Docker Compose
export REGISTRY=${REGISTRY}
export VERSION=${VERSION}
docker-compose -f docker-compose.production.yml up -d

# 5. Verify
docker ps
docker logs -f atomix-backend
curl http://localhost:8080/
curl http://localhost:3000/
```

---

## 📚 Additional Resources

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [OWASP Docker Security](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)

---

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Version:** 1.0.0  
**Project:** Atomix-VidCodex
