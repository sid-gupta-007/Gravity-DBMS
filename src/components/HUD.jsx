import React from "react";

export default function HUD({ gravityActive, setGravityActive }) {
	return (
		<div
			style={{
				position: "absolute",
				top: 30,
				left: 30,
				zIndex: 10,
				color: "white",
				fontFamily: "monospace",
			}}
		>
			<h1 style={{ margin: 0, fontSize: "2rem", letterSpacing: "2px" }}>
				GRAVITY_
			</h1>
			<p style={{ color: "#888" }}>
				System Status: {gravityActive ? "SEMANTIC CLUSTERING" : "IDLE_VOID"}
			</p>

			<button
				onClick={() => setGravityActive(!gravityActive)}
				style={{
					marginTop: "20px",
					padding: "12px 24px",
					background: gravityActive ? "#ff003c" : "#00f0ff",
					color: "black",
					border: "none",
					fontWeight: "bold",
					cursor: "pointer",
					fontFamily: "inherit",
				}}
			>
				{gravityActive ? "DISPERSE GALAXY" : "INITIATE GRAVITY (GROUP BY DEPT)"}
			</button>
		</div>
	);
}
