# Use Ubuntu base image
FROM ubuntu:24.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    python3-venv \
    curl \
    libgl1-mesa-dev \
    libglu1-mesa-dev \
    libxrender1 \
    libxft2 \
    occt-draw \
    && rm -rf /var/lib/apt/lists/*

# Install poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy project files from the correct monorepo path
COPY apps/cad-service/pyproject.toml ./pyproject.toml
COPY apps/cad-service/app ./app

# Install dependencies (generate lock file if missing)
RUN poetry config virtualenvs.create false \
    && poetry lock --no-update \
    && poetry install --no-interaction --no-ansi --only=main

# Expose port
EXPOSE 10000

# Run FastAPI with port from environment
CMD poetry run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}
