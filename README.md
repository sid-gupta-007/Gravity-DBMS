<div align="center">

# G R A V I T Y

**A Cinematic 3D Data Visualization & Hybrid Vector Search Engine**

[![React](https://img.shields.io/badge/React-19.0-000000?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-R3F-000000?style=for-the-badge&logo=threedotjs)](https://threejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-000000?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![HuggingFace](https://img.shields.io/badge/Transformers-MiniLM--L6--v2-000000?style=for-the-badge&logo=huggingface)](https://huggingface.co/)

<br/>

<!-- ADD HERO IMAGE HERE: A sweeping, high-quality GIF or WebP showing the majestic slow rotation of the 3D universe with the stark black background. -->
<img src="https://via.placeholder.com/1000x500/000000/ffffff?text=[Hero+GIF:+Sweeping+Cinematic+Universe+Rotation]" alt="Gravity Hero View" width="100%"/>

<br/>

> *"Do not go gentle into that good night... Rage, rage against the dying of the light."*

</div>

---

**Gravity** is an experimental, performance-driven data visualization engine that renders complex relational databases as an interactive, cinematic 3D universe. 

It pioneers a **zero-API-cost semantic search architecture**, utilizing WebAssembly to generate neural network vector embeddings entirely within the user's browser, cross-referencing them against a Supabase `pgvector` database in real-time.

<br/>

## 🎬 Core Features

- **In-Browser Neural Pathways**: By integrating `@huggingface/transformers` locally, Gravity calculates 384-dimensional semantic vectors in the browser as you type. High-intensity procedural light rays bridge the gap between matching nodes and their domain centers.
- **Deep Space Post-Processing**: The WebGL pipeline runs through a custom post-processing stack featuring High-Intensity Bloom, Film Noise, and anamorphic Chromatic Aberration. Stellar classifications follow realistic thermodynamic color grading.
- **Minimalist Glassmorphism**: The UI rejects soft blurs in favor of a stark, high-contrast aesthetic: deep pitch-black panels, 1px geometric borders, absolute `#000000` canvas backgrounds, and cinematic typography via the `Geist` font family.

<br/>

## 🧠 System Architecture

- **Client Engine**: React + Vite + `@react-three/fiber`
- **Machine Learning**: In-browser NLP via `transformers.js` (all-MiniLM-L6-v2)
- **Database & Auth**: Supabase PostgreSQL with `pgvector` for Cosine Similarity matching.

---

## 🚀 Quick Start

Want to spin up the universe locally? 

```bash
# 1. Clone & Install
git clone https://github.com/yourusername/gravity.git
cd gravity
npm install

# 2. Setup Environment
# Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Populate the Universe
node scripts/seed.js

# 4. Launch Ignition
npm run dev
```

<div align="center">
  <p>With Love 🫶 </p>
  <p>Engineered by <b>NyxLumen, Siddharth Gupta, and Abel Bobby</b> </p>
</div>
