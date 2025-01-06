# Use the official Node.js image as a base
FROM node:23

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the NestJS application
RUN npm run build

# Expose the port your app runs on
EXPOSE 8080

# Start the application
CMD ["npm", "run", "start:prod"]
