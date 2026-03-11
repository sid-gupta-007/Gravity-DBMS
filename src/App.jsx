import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing"; // Added this
import Universe from "./components/Universe";
import ChatInterface from "./components/ChatInterface";

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
			<ChatInterface
				gravityActive={gravityActive}
				setGravityActive={setGravityActive}
			/>

			<Canvas camera={{ position: [0, 0, 120], fov: 60 }}>
				<color attach="background" args={["#020202"]} />

				<Universe triggerGravity={gravityActive} />

				<OrbitControls makeDefault enableDamping dampingFactor={0.05} />

				{/* The Cinematic Glow Engine */}
				<EffectComposer disableNormalPass>
					<Bloom
						luminanceThreshold={1} // Only glows things with color > 1 (our nodes)
						mipmapBlur // Buttery smooth, expensive-looking blur
						intensity={2} // How far the light bleeds
					/>
				</EffectComposer>
			</Canvas>
		</div>
	);
}
