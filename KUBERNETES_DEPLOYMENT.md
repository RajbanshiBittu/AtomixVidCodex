# Atomix VidCodex - Complete Kubernetes Deployment Guide

## Overview

This guide provides a complete production-ready Kubernetes deployment for the Atomix VidCodex fullstack application (Next.js frontend + Express backend).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              atomix-vidcodex Namespace               │  │
│  │                                                      │  │
│  │  ┌──────────────┐         ┌──────────────┐         │  │
│  │  │   Frontend   │         │   Backend    │         │  │
│  │  │  (3 replicas) │         │ (3 replicas) │         │  │
│  │  │  Port: 3000   │         │  Port: 8080  │         │  │
│  │  └───────┬──────┘         └──────┬───────┘         │  │
│  │          │                        │                  │  │
│  │  ┌───────▼──────────────────────▼──────────┐       │  │
│  │  │        Ingress Controller               │       │  │
│  │  │  / → frontend:3000                      │       │  │
│  │  │  /api → backend:8080                    │       │  │
│  │  └────────────────┬────────────────────────┘       │  │
│  │                   │                                 │  │
│  └───────────────────┼─────────────────────────────────┘  │
│                      │                                     │
└──────────────────────┼─────────────────────────────────────┘
                       │
                   ┌───▼───┐
                   │  TLS  │
                   │  443  │
                   └───┬───┘
                       │
                  Public Internet
```

## Directory Structure

```
Atomix-VidCodex/
├── backend/
│   ├── k8s/
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   ├── secret.yaml.example
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── README.md
│   └── Dockerfile.backend
│
├── frontend/
│   ├── k8s/
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   ├── secret.yaml.example
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── ingress.yaml
│   │   └── README.md
│   ├── app/
│   │   └── api/
│   │       ├── healthz/route.ts
│   │       └── ready/route.ts
│   └── Dockerfile.frontend
│
└── KUBERNETES_DEPLOYMENT.md (this file)
```

## Prerequisites

### Required:
- Docker (v20.10+)
- kubectl (v1.24+) configured for your cluster
- Kubernetes cluster (v1.24+)
- Container registry (Docker Hub, GCR, ECR, ACR, etc.)
- **Ingress controller** (NGINX or Traefik) installed in cluster

### Optional but Recommended:
- cert-manager for automatic TLS certificates
- Helm (for easier Ingress controller installation)
- Monitoring (Prometheus, Grafana)

## Quick Start (5 Steps)

### 1. Build and Push Images

```bash
cd /home/atomleapa/Tasks/Revised_Task/Atomix-VidCodex

# Set your registry
export REGISTRY="your-registry.io/your-org"
export VERSION="0.0.1"

# Build images
docker build -f backend/Dockerfile.backend -t atomix-vidcodex-backend:${VERSION} backend/
docker build -f frontend/Dockerfile.frontend -t atomix-vidcodex-frontend:${VERSION} frontend/

# Tag for registry
docker tag atomix-vidcodex-backend:${VERSION} ${REGISTRY}/atomix-vidcodex-backend:${VERSION}
docker tag atomix-vidcodex-frontend:${VERSION} ${REGISTRY}/atomix-vidcodex-frontend:${VERSION}

# Push to registry
docker push ${REGISTRY}/atomix-vidcodex-backend:${VERSION}
docker push ${REGISTRY}/atomix-vidcodex-frontend:${VERSION}
```

### 2. Update Image References

Edit the following files and replace `your-registry.io` with your actual registry:

- `backend/k8s/deployment.yaml` - Line 40
- `frontend/k8s/deployment.yaml` - Line 40

```yaml
image: your-registry.io/your-org/atomix-vidcodex-backend:0.0.1
image: your-registry.io/your-org/atomix-vidcodex-frontend:0.0.1
```

### 3. Deploy Backend

```bash
# Create namespace
kubectl apply -f backend/k8s/namespace.yaml

# Create ConfigMap
kubectl apply -f backend/k8s/configmap.yaml

# Create Service
kubectl apply -f backend/k8s/service.yaml

# Create Deployment
kubectl apply -f backend/k8s/deployment.yaml

# Wait for rollout
kubectl rollout status deployment/atomix-backend -n atomix-vidcodex
```

### 4. Deploy Frontend

```bash
# Create ConfigMap
kubectl apply -f frontend/k8s/configmap.yaml

# Create Service
kubectl apply -f frontend/k8s/service.yaml

# Create Deployment
kubectl apply -f frontend/k8s/deployment.yaml

# Wait for rollout
kubectl rollout status deployment/atomix-frontend -n atomix-vidcodex
```

### 5. Deploy Ingress

**First, ensure Ingress controller is installed:**

```bash
# Check for NGINX Ingress
kubectl get pods -n ingress-nginx

# If not installed, install it:
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

**Update domain names in `frontend/k8s/ingress.yaml`:**

Replace `atomixtools.com` and `www.atomixtools.com` with your domains.

**Deploy Ingress:**

```bash
kubectl apply -f frontend/k8s/ingress.yaml

# Get Ingress IP
kubectl get ingress atomix-ingress -n atomix-vidcodex
```

## Verification

### Check all resources:

```bash
# All resources
kubectl get all -n atomix-vidcodex

# Pods (should see 6 total: 3 backend + 3 frontend)
kubectl get pods -n atomix-vidcodex

# Services
kubectl get svc -n atomix-vidcodex

# Ingress
kubectl get ingress -n atomix-vidcodex
```

### Test health endpoints:

```bash
# Port-forward backend
kubectl port-forward -n atomix-vidcodex svc/atomix-backend 8080:8080 &

# Port-forward frontend
kubectl port-forward -n atomix-vidcodex svc/atomix-frontend 3000:3000 &

# Test backend
curl http://localhost:8080/healthz  # {"success":true,"status":"ok"}
curl http://localhost:8080/ready    # {"success":true,"ready":true}

# Test frontend
curl http://localhost:3000/api/healthz  # {"success":true,"status":"ok"}
curl http://localhost:3000/api/ready    # {"success":true,"ready":true}

# Kill port-forwards
pkill -f "port-forward"
```

### Test through Ingress:

```bash
# Get Ingress IP
INGRESS_IP=$(kubectl get ingress atomix-ingress -n atomix-vidcodex -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test frontend
curl -H "Host: atomixtools.com" http://$INGRESS_IP/

# Test backend API
curl -H "Host: atomixtools.com" http://$INGRESS_IP/api/healthz
```

### Check logs:

```bash
# Backend logs
kubectl logs -n atomix-vidcodex -l app=atomix-backend --tail=50 -f

# Frontend logs
kubectl logs -n atomix-vidcodex -l app=atomix-frontend --tail=50 -f
```

## Production Configuration

### Environment-Specific ConfigMaps

The ConfigMaps contain default production values. Review and update:

**Backend ConfigMap** (`backend/k8s/configmap.yaml`):
- `ALLOWED_ORIGINS` - Your production domains
- `MAX_FILE_SIZE` - Upload limit
- `RATE_LIMIT_MAX_REQUESTS` - API rate limits
- `AUTO_CLEANUP_ENABLED` - File cleanup settings

**Frontend ConfigMap** (`frontend/k8s/configmap.yaml`):
- `NEXT_PUBLIC_API_URL` - Backend URL (internal or external)

### Secrets Management

**NEVER commit secrets to Git!**

Create secrets using kubectl:

```bash
# Backend secrets (if needed)
kubectl create secret generic atomix-backend-secrets \
  --from-literal=API_KEY='your-api-key' \
  --from-literal=JWT_SECRET='your-jwt-secret' \
  --namespace atomix-vidcodex

# Frontend secrets (if needed)
kubectl create secret generic atomix-frontend-secrets \
  --from-literal=API_KEY='your-api-key' \
  --namespace atomix-vidcodex
```

Or use a secrets manager:
- AWS Secrets Manager + External Secrets Operator
- GCP Secret Manager + External Secrets Operator
- HashiCorp Vault
- Sealed Secrets

### TLS Certificates

#### Option 1: cert-manager (Automatic)

Install cert-manager:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

Create ClusterIssuer:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

The Ingress is already configured with cert-manager annotations.

#### Option 2: Manual Certificate

Create TLS secret manually:

```bash
kubectl create secret tls atomixtools-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  --namespace atomix-vidcodex
```

### Resource Limits

Current configuration:

**Backend:**
- Requests: 500m CPU, 512Mi RAM
- Limits: 2000m CPU, 2Gi RAM

**Frontend:**
- Requests: 250m CPU, 512Mi RAM
- Limits: 1000m CPU, 2Gi RAM

Adjust based on your cluster capacity in the deployment YAML files.

### Scaling

```bash
# Scale backend
kubectl scale deployment/atomix-backend -n atomix-vidcodex --replicas=5

# Scale frontend
kubectl scale deployment/atomix-frontend -n atomix-vidcodex --replicas=5

# Or use Horizontal Pod Autoscaler
kubectl autoscale deployment atomix-backend \
  --cpu-percent=70 \
  --min=3 \
  --max=10 \
  -n atomix-vidcodex
```

## Monitoring

### Built-in Kubernetes Monitoring

```bash
# Resource usage
kubectl top pods -n atomix-vidcodex
kubectl top nodes

# Events
kubectl get events -n atomix-vidcodex --sort-by='.lastTimestamp'

# Describe resources
kubectl describe deployment atomix-backend -n atomix-vidcodex
kubectl describe deployment atomix-frontend -n atomix-vidcodex
```

### Prometheus & Grafana (Recommended)

Install kube-prometheus-stack:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n atomix-vidcodex

# Describe pod
kubectl describe pod <pod-name> -n atomix-vidcodex

# Check logs
kubectl logs <pod-name> -n atomix-vidcodex

# Check previous logs if crashed
kubectl logs <pod-name> -n atomix-vidcodex --previous
```

### Image Pull Errors

```bash
# Verify image exists
docker pull your-registry.io/atomix-vidcodex-backend:0.0.1

# Create imagePullSecret for private registry
kubectl create secret docker-registry regcred \
  --docker-server=your-registry.io \
  --docker-username=your-username \
  --docker-password=your-password \
  --namespace atomix-vidcodex

# Add to deployment
spec:
  template:
    spec:
      imagePullSecrets:
        - name: regcred
```

### Health Probe Failures

```bash
# Check probe configuration
kubectl describe pod <pod-name> -n atomix-vidcodex | grep -A 10 "Liveness\|Readiness"

# Test manually
kubectl port-forward <pod-name> 8080:8080 -n atomix-vidcodex
curl http://localhost:8080/healthz
curl http://localhost:8080/ready
```

### Ingress Not Working

```bash
# Check Ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller

# Check Ingress
kubectl describe ingress atomix-ingress -n atomix-vidcodex

# Test backend connectivity from Ingress
kubectl exec -n ingress-nginx <ingress-pod> -- curl http://atomix-backend.atomix-vidcodex:8080/healthz
```

### CORS Issues

Verify ConfigMap has correct ALLOWED_ORIGINS:

```bash
kubectl get configmap atomix-backend-config -n atomix-vidcodex -o yaml
```

Update if needed:

```bash
kubectl edit configmap atomix-backend-config -n atomix-vidcodex

# Then restart backend pods
kubectl rollout restart deployment/atomix-backend -n atomix-vidcodex
```

## Updates and Rollbacks

### Rolling Update

```bash
# Update backend image
kubectl set image deployment/atomix-backend \
  backend=your-registry.io/atomix-vidcodex-backend:0.0.2 \
  -n atomix-vidcodex

# Watch rollout
kubectl rollout status deployment/atomix-backend -n atomix-vidcodex
```

### Rollback

```bash
# View rollout history
kubectl rollout history deployment/atomix-backend -n atomix-vidcodex

# Rollback to previous version
kubectl rollout undo deployment/atomix-backend -n atomix-vidcodex

# Rollback to specific revision
kubectl rollout undo deployment/atomix-backend --to-revision=2 -n atomix-vidcodex
```

## Cleanup

### Remove specific components:

```bash
# Remove Ingress
kubectl delete ingress atomix-ingress -n atomix-vidcodex

# Remove deployments
kubectl delete deployment atomix-backend atomix-frontend -n atomix-vidcodex

# Remove services
kubectl delete service atomix-backend atomix-frontend -n atomix-vidcodex

# Remove ConfigMaps
kubectl delete configmap atomix-backend-config atomix-frontend-config -n atomix-vidcodex
```

### Remove everything:

```bash
# Delete entire namespace (removes all resources)
kubectl delete namespace atomix-vidcodex
```

## Security Checklist

- [x] Non-root users (UID 1001)
- [x] Read-only root filesystem
- [x] No privilege escalation
- [x] Dropped capabilities
- [x] Resource limits configured
- [x] Secrets not in images or Git
- [x] TLS termination at Ingress
- [x] Network policies (ClusterIP only)
- [x] Health probes configured
- [x] Structured logging to stdout/stderr

## Production Checklist

### Images:
- [ ] Backend image built with immutable tag
- [ ] Frontend image built with immutable tag
- [ ] Images pushed to registry
- [ ] Image references updated in manifests

### Configuration:
- [ ] Domain names updated in Ingress
- [ ] CORS origins updated in backend ConfigMap
- [ ] API URL updated in frontend ConfigMap
- [ ] Resource limits reviewed
- [ ] Secrets created (if needed)

### Deployment:
- [ ] Namespace created
- [ ] Backend deployed (3 replicas running)
- [ ] Frontend deployed (3 replicas running)
- [ ] Services created
- [ ] Ingress deployed
- [ ] Ingress controller running
- [ ] TLS certificates configured

### Verification:
- [ ] All pods running and healthy
- [ ] Health probes passing
- [ ] Logs show clean startup
- [ ] Internal connectivity verified
- [ ] External access through Ingress working
- [ ] Frontend loads at https://domain.com/
- [ ] Backend API accessible at https://domain.com/api/
- [ ] File upload and conversion tested

### Operations:
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] Backup strategy in place
- [ ] Rollback procedure documented
- [ ] Team trained on kubectl commands

## Support

For detailed component-specific documentation, see:
- Backend: `backend/k8s/README.md`
- Frontend: `frontend/k8s/README.md`

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/)
