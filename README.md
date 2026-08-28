# 🔬 VisionLab

### AI-Powered Image Analysis Platform

**VisionLab** is a modern AI-powered image analysis web application that allows users to upload an image and get intelligent insights about its content using **Google Gemini AI**.

Built with a modern React frontend and a Node.js/Express backend, VisionLab provides a simple, fast, and intuitive way to interact with multimodal AI.

🌐 **Live Demo:** https://analyzeimage.vercel.app/

---

## ✨ Features

* 🖼️ **Image Upload** — Upload images directly for analysis
* 🤖 **AI-Powered Analysis** — Uses Google Gemini's vision capabilities
* 🔍 **Intelligent Image Understanding** — Extract meaningful information from uploaded images
* ⚡ **Fast & Responsive UI** — Modern interface built with React and Tailwind CSS
* 🔐 **Secure API Handling** — Gemini API key is handled through the backend
* 📱 **Responsive Design** — Works across desktop and mobile screen sizes
* 🌙 **Modern UI** — Clean and minimal interface focused on usability
* 🚀 **Vercel Deployment** — Frontend can be deployed easily to Vercel

---

## 🧠 How It Works

VisionLab follows a simple image-analysis workflow:

```text
┌─────────────────┐
│   Upload Image  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ React Frontend  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Express Backend │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Gemini Vision  │
│      API        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AI Analysis     │
│     Result      │
└─────────────────┘
```

1. User uploads an image.
2. The React frontend sends the image to the backend.
3. The Express server communicates with Google Gemini.
4. Gemini analyzes the image.
5. The generated response is returned to the frontend.
6. VisionLab displays the AI-generated analysis.

---

## 🛠️ Tech Stack

### Frontend

* **React**
* **Vite**
* **Tailwind CSS**
* **JavaScript**
* **HTML5**
* **CSS3**

### Backend

* **Node.js**
* **Express.js**

### AI

* **Google Gemini API**
* **Gemini Vision / Multimodal AI**

### Development & Deployment

* **npm**
* **Git & GitHub**
* **Vercel**

---

## 📁 Project Structure

```text
VisionLab/
│
├── api/
│   └── ...
│
├── src/
│   ├── ...
│   └── App.jsx
│
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── server.js
├── tailwind.config.js
├── vite.config.js
└── README.md
```

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/Usman-raza05/VisionLab.git
```

### 2. Navigate to the project

```bash
cd VisionLab
```

### 3. Install dependencies

```bash
npm install
```

---

## 🔑 Configure Gemini API

VisionLab requires a Google Gemini API key to perform image analysis.

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key
```

> ⚠️ **Never commit your ****`.env`**** file or expose your API key publicly.**

Make sure `.env` is included in your `.gitignore`.

---

## ▶️ Run the Project Locally

VisionLab uses a separate frontend and backend server.

### Start the backend

Open a terminal and run:

```bash
npm run server
```

The backend will run on:

```text
http://localhost:3001
```

### Start the frontend

Open another terminal:

```bash
npm run dev
```

The Vite development server will normally run on:

```text
http://localhost:5173
```

Open the URL in your browser and start analyzing images.

---

## 🔐 Environment Variables

| Variable         | Description                                      |
| ---------------- | ------------------------------------------------ |
| `GEMINI_API_KEY` | Google Gemini API key used for AI image analysis |

---

## 🚨 Important Security Note

The Gemini API key should **never be placed directly inside frontend code**.

VisionLab uses a backend server to handle communication with the Gemini API.

Do not upload:

```text
.env
```

to GitHub.

Instead, use:

```text
.env.example
```

for documenting required environment variables.

Example:

```env
GEMINI_API_KEY=your_api_key_here
```

---

## 🎯 Use Cases

VisionLab can be extended for many AI-powered computer vision use cases, such as:

* 📷 Image description
* 🧾 Document understanding
* 🛍️ Product image analysis
* 🖼️ Visual content analysis
* 📊 Image-based information extraction
* 🎨 Creative image interpretation
* 🔎 Visual question answering

---

## 🚀 Future Improvements

Some planned improvements for VisionLab could include:

* [x] Drag & drop image upload
* [ ] Multiple image analysis
* [x] Image history
* [ ] Download analysis results
* [ ] Copy analysis to clipboard
* [ ] Image comparison
* [ ] PDF/document analysis
* [ ] User authentication
* [ ] Analysis history dashboard
* [ ] Advanced AI prompts
* [ ] More Gemini model options
* [ ] Improved error handling
* [ ] Cloud storage integration

---

## 📊 API Limits

Gemini API usage is subject to the limits of the Google AI Studio/Gemini API plan being used.

For development and personal projects, check the current limits associated with your API key and model before deploying the application publicly.

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

### Fork the repository

```bash
git fork https://github.com/Usman-raza05/VisionLab
```

### Create a branch

```bash
git checkout -b feature/your-feature
```

### Commit your changes

```bash
git commit -m "Add new feature"
```

### Push your branch

```bash
git push origin feature/your-feature
```

Then open a Pull Request.

---

## 📄 License

This project is created for learning, experimentation, and personal development.

You are free to explore and modify the code according to your needs.

---

## 👨‍💻 Author

### Usman Raza

Built with ❤️ using **React, Node.js, Express and Google Gemini AI**.

**GitHub:**
https://github.com/Usman-raza05

**Project:**
https://github.com/Usman-raza05/VisionLab

**Live Demo:**
https://analyzeimage.vercel.app/

---

## ⭐ Support

If you found **VisionLab** useful or interesting, consider giving the repository a ⭐ on GitHub.

It helps support the project and motivates further development.

---

### 🔬 VisionLab

> **See more. Understand better. Powered by AI.**
