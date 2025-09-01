#!/bin/bash

# Configuration
ENVIRONMENT=$1
VERSION=$2
NAMESPACE="cnc-quote-${ENVIRONMENT}"
DEPLOYMENT_TIMEOUT=600s  # 10 minutes

if [ -z "$ENVIRONMENT" ] || [ -z "$VERSION" ]; then
    echo "Usage: $0 <environment> <version>"
    echo "Example: $0 production v1.0.0"
    exit 1
fi

# Function to check deployment status
check_deployment() {
    local deployment=$1
    kubectl rollout status deployment/$deployment -n $NAMESPACE --timeout=$DEPLOYMENT_TIMEOUT
    return $?
}

# Function to rollback deployment
rollback_deployment() {
    local deployment=$1
    echo "Rolling back $deployment..."
    kubectl rollout undo deployment/$deployment -n $NAMESPACE
    check_deployment $deployment
    if [ $? -ne 0 ]; then
        echo "Rollback failed for $deployment"
        exit 1
    fi
}

# Start deployment
echo "Starting deployment to $ENVIRONMENT environment with version $VERSION"

# Create namespace if it doesn't exist
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply database migrations
echo "Applying database migrations..."
kubectl create job --from=cronjob/db-migrate db-migrate-manual-$VERSION -n $NAMESPACE

# Update image versions in deployment files
sed -i "s|cnc-quote/api:.*|cnc-quote/api:$VERSION|g" k8s/deployment.yaml
sed -i "s|cnc-quote/cad-service:.*|cnc-quote/cad-service:$VERSION|g" k8s/deployment.yaml

# Apply Kubernetes configurations
echo "Applying Kubernetes configurations..."
kubectl apply -f k8s/deployment.yaml -n $NAMESPACE

# Check deployments
for deployment in api cad-service; do
    echo "Checking deployment status for $deployment..."
    check_deployment $deployment
    if [ $? -ne 0 ]; then
        echo "Deployment failed for $deployment. Starting rollback..."
        rollback_deployment $deployment
        echo "Deployment failed and rolled back. Please check logs."
        exit 1
    fi
done

# Verify health endpoints
echo "Verifying service health..."
for service in api cad-service; do
    echo "Checking $service health..."
    HEALTH_URL="https://${service}.cnc-quote.com/health"
    response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)
    if [ $response -ne 200 ]; then
        echo "Health check failed for $service. Starting rollback..."
        for d in api cad-service; do
            rollback_deployment $d
        done
        echo "Deployment failed and rolled back. Please check logs."
        exit 1
    fi
done

echo "Deployment successful!"
echo "Version $VERSION is now running in $ENVIRONMENT environment"

# Tag deployment in monitoring
curl -X POST "http://grafana:3000/api/annotations" \
    -H "Content-Type: application/json" \
    -d "{
        \"text\": \"Deployed version $VERSION to $ENVIRONMENT\",
        \"tags\": [\"deployment\", \"$ENVIRONMENT\", \"$VERSION\"]
    }"
