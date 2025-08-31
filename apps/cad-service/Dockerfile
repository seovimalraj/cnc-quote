# Use Ubuntu base image
FROM ubuntu:24.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    python3-dev \
    libgl1-mesa-dev \
    libglu1-mesa-dev \
    libxrender1 \
    libxft2 \
    occt-draw \
    && rm -rf /var/lib/apt/lists/*

# Install poetry
RUN curl -sSL https://install.python-poetry.org | python3 -

# Set working directory
WORKDIR /app

# Copy project files
COPY apps/cad-service/pyproject.toml ./pyproject.toml
COPY apps/cad-service/poetry.lock* ./
COPY apps/cad-service/app ./app

# Install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi

# Run FastAPI with port from environment
CMD poetry run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-3001}
