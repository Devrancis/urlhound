# STAGE 1: Build Environment
# Use a specific Alpine Linux version of Node for a lightweight, secure build base
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only the package manifests first to leverage Docker layer caching
COPY package*.json ./

# WHY 'npm ci' instead of 'npm install'?
# 'ci' (Continuous Integration) strictly follows the package-lock.json. 
# It guarantees reproducible builds and prevents silent dependency updates that could introduce bugs or supply-chain malware.
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Compile the React/Vite application into static assets (outputs to /app/dist)
RUN npm run build

# STAGE 2: Production Server Environment
# Use Nginx Alpine as the final runtime image
FROM nginx:alpine

# Security: Remove the default Nginx welcome page and assets
RUN rm -rf /usr/share/nginx/html/*

# Copy only the compiled static assets from the 'builder' stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose standard HTTP port
EXPOSE 80

# Run Nginx in the foreground (required for Docker containers so they don't exit)
CMD ["nginx", "-g", "daemon off;"]