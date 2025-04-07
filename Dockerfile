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

# Command to run the app
CMD ["node", "client/web-client.js"] 