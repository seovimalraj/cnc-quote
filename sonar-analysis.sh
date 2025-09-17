#!/bin/bash

# SonarQube Analysis Script for CNC Quote
echo "Running SonarQube analysis..."

# Check if SonarQube is running
if ! curl -f http://localhost:9000/api/system/status > /dev/null 2>&1; then
    echo "SonarQube is not running. Please start it with: docker-compose up -d sonarqube"
    exit 1
fi

# Install sonar-scanner if not present
if ! command -v sonar-scanner &> /dev/null; then
    echo "Installing sonar-scanner..."
    npm install -g sonarqube-scanner
fi

#!/bin/bash

# SonarQube Analysis Script for CNC Quote
echo "Running SonarQube analysis..."

# Check if SonarQube is running
if ! curl -f http://localhost:9000/api/system/status > /dev/null 2>&1; then
    echo "SonarQube is not running. Please start it with: docker-compose up -d sonarqube"
    exit 1
fi

# Install sonar-scanner if not present
if ! command -v sonar-scanner &> /dev/null; then
    echo "Installing sonar-scanner..."
    npm install -g sonarqube-scanner
fi

# Run analysis (authentication may not be required for local analysis)
echo "Starting SonarQube analysis..."
sonar-scanner \
    -Dsonar.host.url=http://localhost:9000

echo "SonarQube analysis completed!"
echo "View results at: http://localhost:9000"

echo "SonarQube analysis completed!"
echo "View results at: http://localhost:9000"