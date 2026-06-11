# Stage 1: Build stage
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Runtime stage
FROM node:22-alpine AS runtime
WORKDIR /app

# Copy built files and production dependencies
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./

# Expose port
EXPOSE 4000

# Start command
CMD ["npm", "run", "start:prod"]
