# For UserService/Dockerfile (similar for other services)
FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose the port
EXPOSE 5001

# Start the application
CMD ["npm", "start"]