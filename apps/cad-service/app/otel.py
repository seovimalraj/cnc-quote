"""
Step 19: OpenTelemetry Setup for CAD Service (Python)
Distributed tracing with OTLP exporter
"""

import os
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

# Configuration
SERVICE_NAME = os.getenv('OTEL_RESOURCE_SERVICE_NAME_CAD', 'cad')
OTLP_ENDPOINT = os.getenv('OTEL_EXPORTER_OTLP_ENDPOINT', 'http://localhost:4317')
SAMPLING_RATE = float(os.getenv('TRACE_SAMPLING_RATE', '0.1'))
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

# Initialize tracer provider
resource = Resource.create({
    "service.name": SERVICE_NAME,
    "service.version": "1.0.0",
    "deployment.environment": ENVIRONMENT,
})

# Set up sampler
sampler = TraceIdRatioBased(SAMPLING_RATE)

# Create provider
provider = TracerProvider(
    resource=resource,
    sampler=sampler,
)

# Add OTLP exporter
otlp_exporter = OTLPSpanExporter(
    endpoint=OTLP_ENDPOINT,
    insecure=True,  # Use TLS in production
)

provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

# Set as global provider
trace.set_tracer_provider(provider)

# Get tracer for this module
tracer = trace.get_tracer(__name__)

def instrument_app(app):
    """
    Instrument FastAPI application
    """
    # Instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)
    
    # Instrument Redis (if used)
    try:
        RedisInstrumentor().instrument()
    except Exception:
        pass  # Redis not available
    
    # Instrument requests library
    RequestsInstrumentor().instrument()
    
    print(f"✅ OpenTelemetry instrumented (service={SERVICE_NAME}, endpoint={OTLP_ENDPOINT}, sampling={SAMPLING_RATE})")

def get_tracer():
    """
    Get tracer instance
    """
    return tracer

def shutdown():
    """
    Shutdown tracer provider
    """
    try:
        trace.get_tracer_provider().shutdown()
        print("✅ OpenTelemetry shut down gracefully")
    except Exception as e:
        print(f"❌ Error shutting down OpenTelemetry: {e}")
