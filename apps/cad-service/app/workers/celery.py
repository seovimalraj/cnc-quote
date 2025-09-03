import os
from celery import Celery

# Get Redis URL from environment or use default
REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379/0')

# Initialize Celery
celery_app = Celery(
    'cad',
    broker=os.getenv('CELERY_BROKER_URL', REDIS_URL),
    backend=os.getenv('CELERY_RESULT_BACKEND', REDIS_URL)
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max runtime
    worker_prefetch_multiplier=1,  # Process one task at a time
    worker_max_tasks_per_child=100  # Restart worker after 100 tasks
)
