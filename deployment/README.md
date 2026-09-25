# VeriForge Ops - GKE Deployment Guide

## Prerequisites

- GKE cluster: `lvp-fastapi-cluster` (already configured)
- `gcloud` CLI configured and authenticated
- `kubectl` configured to access the cluster
- Docker installed locally (optional, for local testing)

## Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│              GKE Ingress (LoadBalancer)         │
│                 External IP                      │
└────────────┬────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐      ┌────▼─────┐
│Frontend│      │ Backend  │
│Service │      │ Service  │
│(NodePort)     │(ClusterIP)│
└───┬────┘      └────┬─────┘
    │                │
┌───▼────┐      ┌────▼─────┐      ┌──────────┐
│Frontend│      │ Backend  │──────│ MongoDB  │
│ Pods   │      │  Pods    │      │StatefulSet│
│(x2)    │      │  (x2)    │      │   (x1)   │
└────────┘      └──────────┘      └──────────┘
```

## Quick Start

### Step 1: Set GKE Context

```bash
gcloud container clusters get-credentials lvp-fastapi-cluster --region=<REGION>
```

### Step 2: Get Project ID

```bash
export PROJECT_ID=$(gcloud config get-value project)
echo $PROJECT_ID
```

### Step 3: Build and Push Docker Images

```bash
# From repository root
gcloud builds submit --config=deployment/cloudbuild.yaml
```

This will:
- Build frontend and backend Docker images
- Push to Google Container Registry (GCR)
- Tag with both `latest` and commit SHA

### Step 4: Update Deployment Manifests

Replace `PROJECT_ID` in deployment files:

```bash
# Linux/Mac
sed -i "s/PROJECT_ID/$PROJECT_ID/g" deployment/k8s/backend-deployment.yaml
sed -i "s/PROJECT_ID/$PROJECT_ID/g" deployment/k8s/frontend-deployment.yaml

# Windows (PowerShell)
(Get-Content deployment\k8s\backend-deployment.yaml) -replace 'PROJECT_ID', $env:PROJECT_ID | Set-Content deployment\k8s\backend-deployment.yaml
(Get-Content deployment\k8s\frontend-deployment.yaml) -replace 'PROJECT_ID', $env:PROJECT_ID | Set-Content deployment\k8s\frontend-deployment.yaml
```

### Step 5: Create Namespace

```bash
kubectl apply -f deployment/k8s/namespace.yaml
```

### Step 6: Create Secrets and ConfigMap

```bash
kubectl apply -f deployment/k8s/secrets.yaml
kubectl apply -f deployment/k8s/configmap.yaml
```

### Step 7: Deploy MongoDB

```bash
kubectl apply -f deployment/k8s/mongodb-statefulset.yaml
kubectl apply -f deployment/k8s/mongodb-service.yaml

# Wait for MongoDB to be ready
kubectl wait --for=condition=ready pod -l app=mongodb -n veriforgeops --timeout=300s
```

### Step 8: Deploy Backend

```bash
kubectl apply -f deployment/k8s/backend-deployment.yaml
kubectl apply -f deployment/k8s/backend-service.yaml

# Wait for backend to be ready
kubectl wait --for=condition=ready pod -l app=backend -n veriforgeops --timeout=300s
```

### Step 9: Seed Database (Optional)

```bash
# Get backend pod name
BACKEND_POD=$(kubectl get pods -n veriforgeops -l app=backend -o jsonpath='{.items[0].metadata.name}')

# Run seed script
kubectl exec -it $BACKEND_POD -n veriforgeops -- npm run seed
```

### Step 10: Deploy Frontend

```bash
kubectl apply -f deployment/k8s/frontend-deployment.yaml
kubectl apply -f deployment/k8s/frontend-service.yaml
```

### Step 11: Create Ingress

```bash
# Reserve static IP (optional)
gcloud compute addresses create veriforgeops-ip --global

# Apply ingress
kubectl apply -f deployment/k8s/ingress.yaml

# Get ingress IP (may take 5-10 minutes)
kubectl get ingress veriforgeops-ingress -n veriforgeops -w
```

## Verification

### Check All Resources

```bash
kubectl get all -n veriforgeops
```

### Check Logs

```bash
# Backend logs
kubectl logs -f deployment/backend -n veriforgeops

# Frontend logs
kubectl logs -f deployment/frontend -n veriforgeops

# MongoDB logs
kubectl logs -f statefulset/mongodb -n veriforgeops
```

### Test Backend Health

```bash
kubectl port-forward -n veriforgeops svc/backend-service 4000:4000
# Visit http://localhost:4000/health
```

### Test Frontend

```bash
kubectl port-forward -n veriforgeops svc/frontend-service 8080:80
# Visit http://localhost:8080
```

## Scaling

### Scale Backend

```bash
kubectl scale deployment backend -n veriforgeops --replicas=3
```

### Scale Frontend

```bash
kubectl scale deployment frontend -n veriforgeops --replicas=3
```

## Updates

### Update Backend

```bash
# Build new image
gcloud builds submit --config=deployment/cloudbuild.yaml

# Restart deployment
kubectl rollout restart deployment/backend -n veriforgeops

# Check rollout status
kubectl rollout status deployment/backend -n veriforgeops
```

### Update Frontend

```bash
# Build new image
gcloud builds submit --config=deployment/cloudbuild.yaml

# Restart deployment
kubectl rollout restart deployment/frontend -n veriforgeops

# Check rollout status
kubectl rollout status deployment/frontend -n veriforgeops
```

## Troubleshooting

### Pods Not Starting

```bash
kubectl describe pod <POD_NAME> -n veriforgeops
kubectl logs <POD_NAME> -n veriforgeops
```

### MongoDB Connection Issues

```bash
# Test MongoDB connectivity from backend pod
kubectl exec -it <BACKEND_POD> -n veriforgeops -- sh
# Inside pod:
# curl mongodb-service:27017
```

### Ingress Not Working

```bash
# Check ingress status
kubectl describe ingress veriforgeops-ingress -n veriforgeops

# Check backend health
kubectl get endpoints -n veriforgeops
```

## Cleanup

### Delete All Resources

```bash
kubectl delete namespace veriforgeops
```

### Delete Static IP

```bash
gcloud compute addresses delete veriforgeops-ip --global
```

### Delete Images from GCR

```bash
gcloud container images delete gcr.io/$PROJECT_ID/veriforgeops-frontend:latest
gcloud container images delete gcr.io/$PROJECT_ID/veriforgeops-backend:latest
```

## Environment Variables

### Backend Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `MONGO_URI` | Secret | MongoDB connection string |
| `JWT_SECRET` | Secret | JWT signing secret |
| `PORT` | ConfigMap | Backend port (4000) |
| `NODE_ENV` | ConfigMap | Environment (production) |
| `JWT_EXPIRES_IN` | ConfigMap | JWT expiration time |
| `ALLOWED_ORIGINS` | ConfigMap | CORS allowed origins |

### Frontend Environment Variables

Built into the image at build time via `.env.production`.

## Security Notes

1. **Change JWT Secret**: Update `deployment/k8s/secrets.yaml` with a strong secret
2. **MongoDB Authentication**: Consider enabling MongoDB authentication for production
3. **TLS/HTTPS**: Configure SSL certificate for Ingress in production
4. **Network Policies**: Implement network policies to restrict pod-to-pod communication
5. **RBAC**: Configure proper RBAC roles for service accounts

## Cost Optimization

- **Autoscaling**: Enable HPA (Horizontal Pod Autoscaler)
- **Node Pools**: Use preemptible nodes for non-production workloads
- **Resource Limits**: Tune resource requests/limits based on actual usage
- **Storage**: Use appropriate storage classes for MongoDB PVC

## Monitoring

### Enable GKE Monitoring

```bash
gcloud container clusters update lvp-fastapi-cluster \
  --enable-cloud-monitoring \
  --enable-cloud-logging
```

### View Metrics

- GKE Dashboard: https://console.cloud.google.com/kubernetes
- Cloud Monitoring: https://console.cloud.google.com/monitoring

## Support

For issues or questions, contact the Cognizant AI Practice Engineering team.
