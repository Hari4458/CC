# Kubernetes Deployment Guide for StudyCloud

## Prerequisites
- Kubernetes cluster (Azure AKS, AWS EKS, etc.)
- `kubectl` CLI installed
- Docker image pushed to container registry (Azure Container Registry, DockerHub, etc.)

## Deployment Steps

### 1. Create Namespace (Optional)
```bash
kubectl create namespace studycloud
```

### 2. Create Secrets
Before deploying, update the environment variables in `k8s-secrets.yaml`:
```bash
kubectl apply -f k8s-secrets.yaml
```

### 3. Deploy to Kubernetes
```bash
# Deploy the application
kubectl apply -f deployment.yaml

# Expose the service
kubectl apply -f service.yaml
```

### 4. Verify Deployment
```bash
# Check deployment status
kubectl get deployment

# Check pods
kubectl get pods

# Check service
kubectl get svc
```

### 5. Access the Application
```bash
# Get LoadBalancer IP/DNS
kubectl get svc studycloud-service

# Access via: http://<EXTERNAL-IP>:80
```

## Image Build & Push

### For Azure Container Registry (ACR):
```bash
# Login to ACR
az acr login --name studycloudacr4458

# Build image
docker build -t studycloudacr4458.azurecr.io/study-cloud-app:v1 .

# Push to ACR
docker push studycloudacr4458.azurecr.io/study-cloud-app:v1
```

### For Docker Hub:
```bash
# Build image
docker build -t your-username/studycloud-app:v1 .

# Login to Docker Hub
docker login

# Push to Docker Hub
docker push your-username/studycloud-app:v1

# Update image in deployment.yaml to: your-username/studycloud-app:v1
```

## Troubleshooting

### Check pod logs
```bash
kubectl logs <pod-name>
```

### Check deployment events
```bash
kubectl describe deployment studycloud-deployment
```

### Port forwarding (for local testing)
```bash
kubectl port-forward svc/studycloud-service 3000:80
```

### Delete deployment
```bash
kubectl delete deployment studycloud-deployment
kubectl delete service studycloud-service
kubectl delete secret studycloud-secrets
```

## Scaling

### Scale replicas
```bash
kubectl scale deployment studycloud-deployment --replicas=3
```

## Environment Variables

All environment variables are managed via `k8s-secrets.yaml`. Update this file before deployment:
- SQL_SERVER, SQL_DATABASE, SQL_USER, SQL_PASSWORD
- JWT_SECRET
- EMAIL_USER, EMAIL_PASSWORD
- GEMINI_API_KEY
- AZURE_STORAGE_CONNECTION_STRING
- AZURE_LANGUAGE_KEY, AZURE_LANGUAGE_ENDPOINT
