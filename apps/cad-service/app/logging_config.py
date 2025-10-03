"""
Step 19: Structured Logging for CAD Service (Python)
JSON logs with trace correlation
"""

import os
import logging
import structlog
from opentelemetry import trace
from typing import Any, Dict

# Configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

# PII fields to redact
PII_FIELDS = ['email', 'phone', 'token', 'password', 'address', 'ssn', 'file_path']

def redact_pii(event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Redact PII from log events
    """
    for field in PII_FIELDS:
        if field in event_dict:
            event_dict[field] = '<redacted>'
    
    return event_dict

def add_trace_context(logger: Any, method_name: str, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Add OpenTelemetry trace context to logs
    """
    span = trace.get_current_span()
    if span:
        ctx = span.get_span_context()
        if ctx and ctx.is_valid:
            # Format as hex strings for consistency with Node.js
            event_dict["traceId"] = format(ctx.trace_id, '032x')
            event_dict["spanId"] = format(ctx.span_id, '016x')
            event_dict["traceFlags"] = ctx.trace_flags
    
    return event_dict

def add_service_context(logger: Any, method_name: str, event_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Add service context to logs
    """
    event_dict["service"] = "cad"
    event_dict["environment"] = ENVIRONMENT
    return event_dict

# Configure structlog
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        add_service_context,
        add_trace_context,
        redact_pii,
        structlog.processors.TimeStamper(fmt="iso", utc=True, key="ts"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(sort_keys=True),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

# Configure standard logging
logging.basicConfig(
    format="%(message)s",
    level=getattr(logging, LOG_LEVEL),
)

# Get logger
log = structlog.get_logger()

def log_duration(operation: str):
    """
    Decorator to log operation duration
    """
    def decorator(func):
        import time
        from functools import wraps
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = await func(*args, **kwargs)
                duration_ms = (time.time() - start) * 1000
                log.info(
                    f"{operation} completed",
                    operation=operation,
                    duration_ms=round(duration_ms, 2),
                )
                return result
            except Exception as e:
                duration_ms = (time.time() - start) * 1000
                log.error(
                    f"{operation} failed",
                    operation=operation,
                    duration_ms=round(duration_ms, 2),
                    error=str(e),
                )
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start) * 1000
                log.info(
                    f"{operation} completed",
                    operation=operation,
                    duration_ms=round(duration_ms, 2),
                )
                return result
            except Exception as e:
                duration_ms = (time.time() - start) * 1000
                log.error(
                    f"{operation} failed",
                    operation=operation,
                    duration_ms=round(duration_ms, 2),
                    error=str(e),
                )
                raise
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
