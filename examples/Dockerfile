FROM node:20-alpine

WORKDIR /app

# Install extract2md and serve
RUN npm install extract2md serve

# Copy demo.html into the image
COPY demo.html ./demo.html

# Copy the dist directory from the installed package to /app/dist
RUN mkdir -p dist && \
    cp -r node_modules/extract2md/dist/* dist/

# Expose port for the static server
EXPOSE 8080

# Serve the current directory (demo.html and dist/)
CMD ["npx", "serve", "--listen", "8080", "."] 