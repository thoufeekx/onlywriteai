FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for MVP)
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start in development mode for MVP
CMD ["npm", "run", "dev"]
