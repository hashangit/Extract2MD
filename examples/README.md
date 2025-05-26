# Extract2MD Demo Docker Instructions

This guide explains how to build and run a Docker container to serve the `demo.html` file for Extract2MD, including all required assets.

## Prerequisites

- [Docker](https://www.docker.com/get-started) installed on your system
- Internet connection (to pull the Node.js image and npm packages)

## Steps

### 1. Build the Docker Image

From the project root (where the `examples/` folder is located), run:

```sh
docker build -t extract2md-demo ./examples
```

This will:
- Use the provided `Dockerfile` in the `examples/` folder
- Install `extract2md` and `serve` via npm
- Copy `demo.html` and all required assets into the image

### 2. Run the Docker Container

Run the following command to start the server (mapping container port 8080 to your local port 8081):

```sh
docker run -p 8081:8080 extract2md-demo
```

- The server will be accessible at [http://localhost:8081/demo.html](http://localhost:8081/demo.html)

### 3. Using the Demo

- Open your browser and go to [http://localhost:8081/demo.html](http://localhost:8081/demo.html)
- Upload a PDF and select a scenario to test the Extract2MD conversion features

### 4. Troubleshooting

- If you get a 404 error, make sure you are visiting `/demo.html` (not `/demo` or `/`).
- If you see errors about missing assets, ensure the Docker build completed successfully and that the `dist` directory is present in the container (it should be automatically copied from the npm package).
- For WebLLM scenarios, ensure your browser supports WebGPU.

### 5. Stopping the Container

Press `Ctrl+C` in the terminal where the container is running, or run:

```sh
docker ps  # Find the container ID
# Then:
docker stop <container_id>
```

---

**For development or advanced usage, you can modify `demo.html` and rebuild the image to see your changes.** 