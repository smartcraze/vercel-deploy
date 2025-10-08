
# 🧪 Vercel Clone – React Project Hosting Platform

This project is a simplified **Vercel clone** designed to automatically build and host **React applications**. Each React app is deployed using a unique `projectId` and is served locally at `http://<projectId>.localhost:8000`.


<img width="5887" height="1522" alt="image" src="https://github.com/user-attachments/assets/b98fa95e-9ea9-4e21-aa85-f084bf19bb55" />


Basically it build the file of react and the dist or the build folder of the application is uploaded to the R2 similar to S3 object storage and with the help of the reverse proxies native support of node js we proxies the request of the subdomain.domain to the actual url of the R2 
i will very soon add the frontend of this vercel very soon

---

## 🚀 Features

- Clone and host any React application.
- Docker-based build system.
- Local reverse proxy for subdomain-style routing using `projectId`.
- Instantly accessible at `http://<projectId>.localhost:8000`.

---

## 📦 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/smartcraze/vercel-deploy.git
cd vercel-deploy
```

### 2. Build the React App with Docker

Navigate into the project builder directory:

```bash
cd builder
docker build -t builder .
```

### 3. Start the Reverse Proxy

Start the reverse proxy service to route requests based on subdomains:

```bash
cd reverse-proxy
npm run dev 
```

---

### 4. Access Your Hosted React App

Once the build is complete, your app will be available at:

```
http://<projectId>.localhost:8000
```

Replace `<projectId>` with the actual ID you assigned to your React project.

---

## 🛠 Tech Stack

- **Docker**
- **Node.js / Express (for routing & serving)**
- **Reverse Proxy (Node reverse proxy native )**
- **React.js**
- **R2 as Strorage**

---

## 📁 Folder Structure

```
.
├── builder/           # Contains Dockerfile and logic to build React projects
├── proxy/             # Reverse proxy configuration backend
├── frontend           # frontend of the vercel-deploy apps
└── README.md
```

---

## 🌐 Example

```bash
# Build a project with ID `myapp`
cd builder
docker build -t myapp .

# Once reverse proxy is running
Visit: http://myapp.localhost:8000
```

---

## 🤝 Contributing

PRs are welcome! If you’d like to add multi-framework support, real-time deployments, or cloud storage—open a feature request or fork the project.
