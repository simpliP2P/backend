# Use Alpine for smaller image size
FROM node:23-alpine AS builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:23-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder
COPY --from=builder /usr/src/app/dist ./dist

# Expose port
EXPOSE 8080

# Use node directly instead of npm (faster, better signal handling)
CMD ["node", "dist/main"]