#!/bin/bash

# VeriForge Ops - GKE Deployment Script
# Cluster: lvp-fastapi-cluster

set -e

echo "=========================================="
echo "VeriForge Ops - GKE Deployment"
echo "=========================================="

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
echo "Project ID: $PROJECT_ID"

# Get cluster credentials
echo ""
echo "Step 1: Getting cluster credentials..."
read -p "Enter GKE cluster region (e.g., us-central1): " REGION
gcloud container clusters get-credentials lvp-fastapi-cluster --region=$REGION

# Build and push images
echo ""
echo "Step 2: Building and pushing Docker images..."
read -p "Build images now? (y/n): " BUILD
if [ "$BUILD" = "y" ]; then
  gcloud builds submit --config=deployment/cloudbuild.yaml
  echo "✓ Images built and pushed to GCR"
fi

# Update deployment files with project ID
echo ""
echo "Step 3: Updating deployment manifests..."
sed -i "s/PROJECT_ID/$PROJECT_ID/g" deployment/k8s/backend-deployment.yaml
sed -i "s/PROJECT_ID/$PROJECT_ID/g" deployment/k8s/frontend-deployment.yaml
echo "✓ Manifests updated"

# Create namespace
echo ""
echo "Step 4: Creating namespace..."
kubectl apply -f deployment/k8s/namespace.yaml
echo "✓ Namespace created"

# Create secrets and configmap
echo ""
echo "Step 5: Creating secrets and configmap..."
kubectl apply -f deployment/k8s/secrets.yaml
kubectl apply -f deployment/k8s/configmap.yaml
echo "✓ Secrets and ConfigMap created"

# Deploy MongoDB
echo ""
echo "Step 6: Deploying MongoDB..."
kubectl apply -f deployment/k8s/mongodb-statefulset.yaml
kubectl apply -f deployment/k8s/mongodb-service.yaml
echo "Waiting for MongoDB to be ready..."
kubectl wait --for=condition=ready pod -l app=mongodb -n veriforgeops --timeout=300s
echo "✓ MongoDB deployed and ready"

# Deploy Backend
echo ""
echo "Step 7: Deploying Backend..."
kubectl apply -f deployment/k8s/backend-deployment.yaml
kubectl apply -f deployment/k8s/backend-service.yaml
echo "Waiting for Backend to be ready..."
kubectl wait --for=condition=ready pod -l app=backend -n veriforgeops --timeout=300s
echo "✓ Backend deployed and ready"

# Seed database
echo ""
read -p "Seed database with demo data? (y/n): " SEED
if [ "$SEED" = "y" ]; then
  BACKEND_POD=$(kubectl get pods -n veriforgeops -l app=backend -o jsonpath='{.items[0].metadata.name}')
  echo "Seeding database..."
  kubectl exec -it $BACKEND_POD -n veriforgeops -- npm run seed
  echo "✓ Database seeded"
fi

# Deploy Frontend
echo ""
echo "Step 8: Deploying Frontend..."
kubectl apply -f deployment/k8s/frontend-deployment.yaml
kubectl apply -f deployment/k8s/frontend-service.yaml
echo "✓ Frontend deployed"

# Create Ingress
echo ""
read -p "Create Ingress with LoadBalancer? (y/n): " INGRESS
if [ "$INGRESS" = "y" ]; then
  echo "Reserving static IP..."
  gcloud compute addresses create veriforgeops-ip --global || echo "IP already exists"
  
  echo "Creating Ingress..."
  kubectl apply -f deployment/k8s/ingress.yaml
  echo "✓ Ingress created (may take 5-10 minutes to provision)"
fi

# Summary
echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Check status:"
echo "  kubectl get all -n veriforgeops"
echo ""
echo "View logs:"
echo "  kubectl logs -f deployment/backend -n veriforgeops"
echo "  kubectl logs -f deployment/frontend -n veriforgeops"
echo ""
echo "Get Ingress IP:"
echo "  kubectl get ingress veriforgeops-ingress -n veriforgeops"
echo ""
echo "Port forward (for testing):"
echo "  kubectl port-forward -n veriforgeops svc/frontend-service 8080:80"
echo ""
