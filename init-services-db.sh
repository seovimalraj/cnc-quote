#!/bin/bash

# Set PostgreSQL password for external connections
export PGPASSWORD=Nb+a5meKduZsNG/HtSaSktBQYbdB8mcb

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
while ! pg_isready -h localhost -p 5432 -U postgres; do
  sleep 2
done

echo "PostgreSQL is ready. Creating additional databases..."

# Create databases for Sentry and Keycloak
psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE sentry;" || echo "Sentry database already exists"
psql -h localhost -p 5432 -U postgres -c "CREATE USER sentry WITH PASSWORD 'InYNZ0S7wHmWMmcBD5GeQK3qZnf8JfCrzaNXleU/Wx8=';" || echo "Sentry user already exists"
psql -h localhost -p 5432 -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE sentry TO sentry;" || echo "Sentry privileges already granted"

psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE keycloak;" || echo "Keycloak database already exists"
psql -h localhost -p 5432 -U postgres -c "CREATE USER keycloak WITH PASSWORD 'FyOsLqvPXlo13oLlmEguNRQ4xp3Ji+hW/OZVrnkTmGY=';" || echo "Keycloak user already exists"
psql -h localhost -p 5432 -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE keycloak TO keycloak;" || echo "Keycloak privileges already granted"
psql -h localhost -p 5432 -U postgres -c "GRANT ALL ON SCHEMA public TO keycloak;" || echo "Keycloak schema privileges already granted"

psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE sonarqube;" || echo "SonarQube database already exists"
psql -h localhost -p 5432 -U postgres -c "CREATE USER sonarqube WITH PASSWORD 'I3Vpgqewff7SV3vqxaAZbQxwZkQ4HhQr1CvOGjAcVUs=';" || echo "SonarQube user already exists"
psql -h localhost -p 5432 -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE sonarqube TO sonarqube;" || echo "SonarQube privileges already granted"
psql -h localhost -p 5432 -d sonarqube -c "GRANT ALL ON SCHEMA public TO sonarqube;" || echo "SonarQube schema privileges already granted"

echo "All databases created successfully!"