import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing"; // Added this
import Universe from "./components/Universe";
import ChatInterface from "./components/ChatInterface";

// App.jsx
export default function App() {
	const [gravityActive, setGravityActive] = useState(false);

	return (
		<div
			style={{
				width: "100vw",
				height: "100vh",
				background: "#050505",
				position: "relative",
			}}
		>
			<Canvas camera={{ position: [0, 0, 120], fov: 60 }}>
				<color attach="background" args={["#020202"]} />
				<Universe triggerGravity={gravityActive} />
				<OrbitControls makeDefault enableDamping dampingFactor={0.05} />
				<EffectComposer disableNormalPass>
					<Bloom luminanceThreshold={0.5} mipmapBlur intensity={2} />
				</EffectComposer>
			</Canvas>

			{/* Move the UI HERE, below the Canvas */}
			<ChatInterface
				gravityActive={gravityActive}
				setGravityActive={setGravityActive}
			/>
		</div>
	);
}
