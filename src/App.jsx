import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Universe from "./components/Universe";
import HUD from "./components/HUD";

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
			<HUD gravityActive={gravityActive} setGravityActive={setGravityActive} />

			<Canvas camera={{ position: [0, 0, 120], fov: 60 }}>
				<color attach="background" args={["#020202"]} />
				<Universe triggerGravity={gravityActive} />
				<OrbitControls makeDefault enableDamping dampingFactor={0.05} />
			</Canvas>
		</div>
	);
}
