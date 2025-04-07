FROM node:18-slim

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Create a public directory for static files
RUN mkdir -p client/public

# Expose the port the app runs on
EXPOSE 3100

# Environment variables
ENV NODE_ENV=production
# These will be overriden by Railway
ENV ANTHROPIC_API_KEY="needs-to-be-set"
ENV MODEL_NAME="claude-3-sonnet-20240229"
ENV RAILWAY_SERVER_URL="https://bakery-production-8bbd.up.railway.app"

# Command to run the app
CMD ["node", "client/web-client.js"] 