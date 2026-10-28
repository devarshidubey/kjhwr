# Stage 1: Builder
FROM python:3.12-slim AS builder

WORKDIR /app
COPY requirements.txt .
COPY requirements/ ./requirements/

RUN pip install --prefix=/install --no-cache-dir -r requirements.txt


# Stage 2: Runtime
FROM python:3.12-slim AS runtime

RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --create-home appuser

WORKDIR /app

COPY --from=builder /install /usr/local
COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 8000
#CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "wsgi:app"]
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "--worker-tmp-dir", "/dev/shm", "wsgi:app"]