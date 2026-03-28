# Use Node 20 (required by mongoose)
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the project
COPY . .

# Expose port 8000
EXPOSE 8000

# Start the server
CMD ["node", "server.js"]