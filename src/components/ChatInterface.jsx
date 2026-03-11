import React, { useState } from "react";
import styles from "./ChatInterface.module.css";

export default function ChatInterface({ gravityActive, setGravityActive }) {
	const [query, setQuery] = useState("");

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!query.trim()) return;
		setGravityActive(true); // Triggers the move to the bottom
	};

	return (
		<div className={styles.wrapper}>
			<div
				className={`${styles.stage} ${gravityActive ? styles.stageActive : ""}`}
			>
				<h1
					className={`${styles.title} ${gravityActive ? styles.titleHidden : ""}`}
				>
					GRAVITY<span>_</span>
				</h1>

				<form
					onSubmit={handleSubmit}
					className={`${styles.searchBar} ${gravityActive ? styles.searchBarActive : ""}`}
				>
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Query the void..."
						className={styles.inputField}
					/>
					<button type="submit" className={styles.submitBtn}>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
						>
							<path d="M12 19V5M5 12l7-7 7 7" />
						</svg>
					</button>
				</form>
			</div>
		</div>
	);
}
