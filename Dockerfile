# Base Image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Expose port
EXPOSE 3000

# Default command for development
# Next.js needs hostname 0.0.0.0 to be accessible outside container
CMD ["npm", "run", "dev", "--", "--webpack", "--port", "3000", "--hostname", "0.0.0.0"]
