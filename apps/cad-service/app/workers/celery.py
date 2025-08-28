from celery import Celery

# Initialize Celery
celery_app = Celery(
    'cad',
    broker='redis://redis:6379/0',
    backend='redis://redis:6379/0'
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
