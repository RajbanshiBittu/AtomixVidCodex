# Atomix VidCodex Backend - Kubernetes Deployment Guide

## Overview

Production-grade Kubernetes deployment for the Atomix VidCodex backend API service with FFmpeg-based video conversion capabilities.

## Prerequisites

- Docker installed and configured
- kubectl configured and connected to your cluster
- A container registry (Docker Hub, GCR, ECR, etc.)
- Kubernetes cluster (v1.24+)
- Ingress controller (NGINX, Traefik, etc.)
- cert-manager (optional, for automatic TLS)

## Directory Structure

```
backend/k8s/
├── namespace.yaml          # Dedicated namespace
├── configmap.yaml          # Non-sensitive configuration
├── secret.yaml.example     # Secret template (DO NOT commit actual secrets)
├── deployment.yaml         # Backend deployment with 3 replicas
├── service.yaml            # ClusterIP service
└── README.md              # This file
```

## Step 1: Build Docker Image

Build the backend Docker image with an **immutable tag** (never use `latest`):

```bash
# Navigate to project root
cd /home/atomleapa/Tasks/Revised_Task/Atomix-VidCodex

# Build with version tag
docker build -f backend/Dockerfile.backend -t atomix-vidcodex-backend:0.0.1 backend/

# Or build with commit SHA for maximum immutability
COMMIT_SHA=$(git rev-parse --short HEAD)
docker build -f backend/Dockerfile.backend -t atomix-vidcodex-backend:${COMMIT_SHA} backend/
```

## Step 2: Tag and Push to Registry

Replace `your-registry.io/your-org` with your actual registry:

```bash
# Set your registry
REGISTRY="your-registry.io/your-org"
VERSION="0.0.1"

# Tag the image
docker tag atomix-vidcodex-backend:${VERSION} ${REGISTRY}/atomix-vidcodex-backend:${VERSION}

# Push to registry
docker push ${REGISTRY}/atomix-vidcodex-backend:${VERSION}

# Also push with SHA256 digest for extra immutability
docker push ${REGISTRY}/atomix-vidcodex-backend:${VERSION}
docker inspect --format='{{index .RepoDigests 0}}' ${REGISTRY}/atomix-vidcodex-backend:${VERSION}
```

## Step 3: Update Deployment Manifest

Edit `deployment.yaml` and update the image reference:

```yaml
spec:
  containers:
    - name: backend
      # Replace with your registry and version
      image: your-registry.io/your-org/atomix-vidcodex-backend:0.0.1
      # Or use SHA256 digest for maximum immutability
      # image: your-registry.io/your-org/atomix-vidcodex-backend@sha256:abc123...
```

## Step 4: Create Namespace

```bash
kubectl apply -f backend/k8s/namespace.yaml
```

Verify:
```bash
kubectl get namespace atomix-vidcodex
```

## Step 5: Create ConfigMap

The ConfigMap contains non-sensitive configuration:

```bash
kubectl apply -f backend/k8s/configmap.yaml
```

Verify:
```bash
kubectl get configmap atomix-backend-config -n atomix-vidcodex
kubectl describe configmap atomix-backend-config -n atomix-vidcodex
```

## Step 6: Create Secrets (Optional)

**NEVER commit secrets to Git.** Create secrets using kubectl or a secrets manager:

### Using kubectl:

```bash
kubectl create secret generic atomix-backend-secrets \
  --from-literal=API_KEY='your-actual-api-key' \
  --from-literal=JWT_SECRET='your-actual-jwt-secret' \
  --namespace atomix-vidcodex
```

### Using a secrets file (for non-production testing only):

```bash
# Create from the example file
cp backend/k8s/secret.yaml.example backend/k8s/secret.yaml

# Edit and add base64-encoded values
# echo -n 'your-secret-value' | base64

# Apply (DO NOT commit secret.yaml)
kubectl apply -f backend/k8s/secret.yaml

# Add to .gitignore
echo "backend/k8s/secret.yaml" >> .gitignore
```

### Using a secrets manager (Production):

- AWS Secrets Manager + External Secrets Operator
- GCP Secret Manager + External Secrets Operator
- HashiCorp Vault
- Sealed Secrets

Verify:
```bash
kubectl get secret atomix-backend-secrets -n atomix-vidcodex
```

## Step 7: Deploy Backend Service

```bash
kubectl apply -f backend/k8s/service.yaml
```

Verify:
```bash
kubectl get service atomix-backend -n atomix-vidcodex
kubectl describe service atomix-backend -n atomix-vidcodex
```

## Step 8: Deploy Backend Application

```bash
kubectl apply -f backend/k8s/deployment.yaml
```

## Step 9: Verify Deployment

Check rollout status:
```bash
kubectl rollout status deployment/atomix-backend -n atomix-vidcodex
```

Check pods:
```bash
kubectl get pods -n atomix-vidcodex -l app=atomix-backend
kubectl get pods -n atomix-vidcodex -l app=atomix-backend -o wide
```

Expected output (3 replicas):
```
NAME                              READY   STATUS    RESTARTS   AGE
atomix-backend-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
atomix-backend-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
atomix-backend-xxxxxxxxxx-xxxxx   1/1     Running   0          2m
```

## Step 10: Verify Health Endpoints

### Port-forward to test locally:

```bash
kubectl port-forward -n atomix-vidcodex svc/atomix-backend 8080:8080
```

In another terminal:

```bash
# Test liveness probe
curl http://localhost:8080/healthz
# Expected: {"success":true,"status":"ok"}

# Test readiness probe
curl http://localhost:8080/ready
# Expected: {"success":true,"ready":true}

# Test API root
curl http://localhost:8080/
# Expected: {"success":true,"message":"Video Format Converter API","version":"1.0.0",...}
```

### Check probes in Kubernetes:

```bash
# Check probe status
kubectl describe pod -n atomix-vidcodex -l app=atomix-backend | grep -A 5 "Liveness\|Readiness"

# Check events
kubectl get events -n atomix-vidcodex --sort-by='.lastTimestamp' | grep backend
```

## Step 11: Check Logs

View logs from all backend pods:

```bash
# All backend pods
kubectl logs -n atomix-vidcodex -l app=atomix-backend --tail=100

# Follow logs in real-time
kubectl logs -n atomix-vidcodex -l app=atomix-backend --tail=100 -f

# Specific pod
kubectl logs -n atomix-vidcodex <pod-name>

# Previous container logs (if pod crashed)
kubectl logs -n atomix-vidcodex <pod-name> --previous
```

Expected log output:
```
info: ==================================================
info: Video Format Converter Backend API Server
info: ==================================================
info: Server running on: http://0.0.0.0:8080
info: Started at: 2026-02-13T...
info: Max file size: 1024 MB
info: Auto cleanup: Enabled
...
```

## Step 12: Test From Inside Cluster

Create a test pod to verify internal connectivity:

```bash
kubectl run -n atomix-vidcodex test-curl --image=curlimages/curl:latest --rm -it --restart=Never -- sh

# Inside the pod:
curl http://atomix-backend:8080/healthz
curl http://atomix-backend:8080/ready
curl http://atomix-backend:8080/
```

## Ingress Configuration

The backend should be exposed via Ingress at `/api` path. See the frontend k8s directory for the Ingress manifest that routes:
- `/` → frontend service
- `/api` → backend service

## Scaling

Scale the deployment:

```bash
# Scale to 5 replicas
kubectl scale deployment/atomix-backend -n atomix-vidcodex --replicas=5

# Verify
kubectl get pods -n atomix-vidcodex -l app=atomix-backend

# Scale back to 3
kubectl scale deployment/atomix-backend -n atomix-vidcodex --replicas=3
```

## Rolling Updates

Update the image version:

```bash
# Update image
kubectl set image deployment/atomix-backend backend=your-registry.io/atomix-vidcodex-backend:0.0.2 -n atomix-vidcodex

# Watch rollout
kubectl rollout status deployment/atomix-backend -n atomix-vidcodex

# Check rollout history
kubectl rollout history deployment/atomix-backend -n atomix-vidcodex

# Rollback if needed
kubectl rollout undo deployment/atomix-backend -n atomix-vidcodex
```

## Troubleshooting

### Pods not starting:

```bash
# Check pod status
kubectl get pods -n atomix-vidcodex -l app=atomix-backend

# Describe pod to see events
kubectl describe pod -n atomix-vidcodex <pod-name>

# Check logs
kubectl logs -n atomix-vidcodex <pod-name>
```

### Image pull errors:

```bash
# Check if image exists in registry
docker pull your-registry.io/atomix-vidcodex-backend:0.0.1

# Verify imagePullSecrets if using private registry
kubectl get serviceaccount default -n atomix-vidcodex -o yaml
```

### Probe failures:

```bash
# Check probe configuration
kubectl describe deployment atomix-backend -n atomix-vidcodex | grep -A 10 "Liveness\|Readiness"

# Port-forward and test manually
kubectl port-forward -n atomix-vidcodex svc/atomix-backend 8080:8080
curl http://localhost:8080/healthz
curl http://localhost:8080/ready
```

### Resource issues:

```bash
# Check resource usage
kubectl top pods -n atomix-vidcodex -l app=atomix-backend

# Check resource requests/limits
kubectl describe pod -n atomix-vidcodex <pod-name> | grep -A 5 "Requests\|Limits"
```

## Cleanup

Remove all backend resources:

```bash
# Delete deployment
kubectl delete deployment atomix-backend -n atomix-vidcodex

# Delete service
kubectl delete service atomix-backend -n atomix-vidcodex

# Delete configmap
kubectl delete configmap atomix-backend-config -n atomix-vidcodex

# Delete secrets (if any)
kubectl delete secret atomix-backend-secrets -n atomix-vidcodex

# Delete namespace (removes everything)
kubectl delete namespace atomix-vidcodex
```

## Security Considerations

✅ **Non-root user**: Runs as UID 1001  
✅ **Read-only root filesystem**: Prevents tampering  
✅ **No privilege escalation**: Security hardened  
✅ **Dropped capabilities**: Minimal permissions  
✅ **Secrets management**: Never in images or Git  
✅ **Resource limits**: Prevents resource exhaustion  
✅ **Network policies**: ClusterIP only, no external exposure  

## Production Checklist

- [ ] Image pushed to registry with immutable tag
- [ ] Image reference updated in deployment.yaml
- [ ] ConfigMap values reviewed and updated
- [ ] Secrets created using kubectl or secrets manager
- [ ] Namespace created
- [ ] Service created
- [ ] Deployment created
- [ ] All 3 replicas running
- [ ] Health probes responding (200 OK)
- [ ] Logs show successful startup
- [ ] Internal connectivity verified
- [ ] Ingress configured and routing /api to backend
- [ ] TLS termination at Ingress level
- [ ] Monitoring and alerts configured
- [ ] Backup and disaster recovery plan in place

## Additional Resources

- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [Container Image Security](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Secrets Management](https://kubernetes.io/docs/concepts/configuration/secret/)
