import React, { useState } from "react";
import styles from "./ChatInterface.module.css";

export default function ChatInterface({
	onSearch,
	onReset,
	isSearching,
	hasResults,
}) {
	const [query, setQuery] = useState("");

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!query.trim() || isSearching) return;
		onSearch(query.trim());
	};

	const handleReset = () => {
		setQuery("");
		onReset?.();
	};

	return (
		<div className={styles.wrapper}>
			<div
				className={`${styles.stage} ${hasResults ? styles.stageActive : ""}`}
			>
				<h1
					className={`${styles.title} ${hasResults ? styles.titleHidden : ""}`}
				>
					GRAVITY
				</h1>
				<p
					className={`${styles.subtitle} ${hasResults ? styles.titleHidden : ""}`}
				>
					Semantic Search Engine — powered by pgvector
				</p>

				<form
					onSubmit={handleSubmit}
					className={`liquid-glass ${styles.searchBar} ${hasResults ? styles.searchBarActive : ""}`}
				>
					{hasResults && (
						<button
							type="button"
							className={styles.resetBtn}
							onClick={handleReset}
							title="Reset search"
						>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
								<path d="M3 3v5h5" />
							</svg>
						</button>
					)}
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Ask Gravity anything..."
						className={styles.inputField}
						disabled={isSearching}
					/>
					<button
						type="submit"
						className={styles.submitBtn}
						disabled={isSearching || !query.trim()}
					>
						{isSearching ? (
							<div className={styles.spinner} />
						) : (
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M12 19V5M5 12l7-7 7 7" />
							</svg>
						)}
					</button>
				</form>
			</div>
		</div>
	);
}
