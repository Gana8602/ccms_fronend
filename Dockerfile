# Stage 1: Build the Angular application
FROM node:18-alpine as builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build -- --configuration production

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built Angular app from the builder stage
COPY --from=builder /app/dist/angular-frontend/browser /usr/share/nginx/html

# Expose port 8767
EXPOSE 8767

CMD ["nginx", "-g", "daemon off;"]
