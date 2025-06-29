FROM python:3.9-slim

# Install system dependencies for SFTP
RUN apt-get update && apt-get install -y \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py ./

# Create directory for SSH keys
RUN mkdir -p /root/.ssh && chmod 700 /root/.ssh

# Set environment variables
ENV PYTHONPATH=/app
ENV AWS_DEFAULT_REGION=us-east-1

# Run the data collector
CMD ["python", "sftp_data_collector.py"]