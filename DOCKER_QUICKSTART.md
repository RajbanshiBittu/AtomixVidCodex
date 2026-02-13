# 🚀 Docker Quick Reference

## Build Commands

```bash
# Set environment
export REGISTRY=docker.io/yourusername
export VERSION=1.0.0

# Backend
docker build -f backend/Dockerfile.backend -t ${REGISTRY}/atomix-vidcodex-backend:${VERSION} backend/

# Frontend  
docker build -f frontend/Dockerfile.frontend -t ${REGISTRY}/atomix-vidcodex-frontend:${VERSION} frontend/
```

## Push Commands

```bash
docker push ${REGISTRY}/atomix-vidcodex-backend:${VERSION}
docker push ${REGISTRY}/atomix-vidcodex-frontend:${VERSION}
```

## Run Commands (Production)

### Using Docker Run

**Backend:**
```bash
docker run -d \
  --name atomix-backend \
  --restart unless-stopped \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \
  --tmpfs /app/uploads:rw,noexec,nosuid,size=500m \
  --tmpfs /app/outputs:rw,noexec,nosuid,size=2g \
  -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  -e ALLOWED_ORIGINS=https://atomixtools.com,https://www.atomixtools.com \
  ${REGISTRY}/atomix-vidcodex-backend:${VERSION}
```

**Frontend:**
```bash
docker run -d \
  --name atomix-frontend \
  --restart unless-stopped \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \
  -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_API_URL=https://api.atomixtools.com \
  ${REGISTRY}/atomix-vidcodex-frontend:${VERSION}
```

### Using Docker Compose

```bash
# 1. Copy example env file
cp .env.production.example .env.production

# 2. Edit .env.production with your values
nano .env.production

# 3. Deploy
docker-compose -f docker-compose.production.yml up -d

# 4. View logs
docker-compose -f docker-compose.production.yml logs -f

# 5. Stop
docker-compose -f docker-compose.production.yml down
```

## Essential Environment Variables

### Backend (Required)
- `ALLOWED_ORIGINS` - Your production domains (comma-separated)

### Frontend (Required)  
- `NEXT_PUBLIC_API_URL` - Your backend API URL

## Health Checks

```bash
# Check status
docker ps

# View health
docker inspect --format='{{.State.Health.Status}}' atomix-backend

# Test endpoints
curl http://localhost:8080/
curl http://localhost:3000/
```

## Logs

```bash
# Backend
docker logs -f atomix-backend

# Frontend
docker logs -f atomix-frontend

# Compose
docker-compose -f docker-compose.production.yml logs -f
```

## Security Checklist

- [ ] Images tagged with version (no `latest`)
- [ ] Non-root user (nodejs/nextjs)
- [ ] No secrets in images
- [ ] Read-only filesystem
- [ ] Resource limits set
- [ ] CORS configured
- [ ] Logs to stdout/stderr

## Full Documentation

See [DOCKER_PRODUCTION_GUIDE.md](./DOCKER_PRODUCTION_GUIDE.md) for complete details.
