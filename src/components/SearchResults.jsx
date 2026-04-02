import React from "react";
import styles from "./SearchResults.module.css";

// Updated to use entity types instead of old categories
const ENTITY_COLORS = {
	Course: "#9db4ff",
	Subject: "#baccff",
	Teacher: "#fff5ec",
	Student: "#ffbe7f",
	General: "#6ee7b7",
};

export default function SearchResults({
	results,
	onDeleteRecord,
	onHoverResult,
	onSelectResult,
	isLoading,
}) {
	if (isLoading) {
		return (
			<div
				className={`liquid-glass ${styles.container}`}
				style={{ padding: 24, borderRadius: 16 }}
			>
				<div className={styles.loadingBar}>
					<div className={styles.loadingFill} />
				</div>
				<p className={styles.loadingText}>Searching the universe...</p>
			</div>
		);
	}

	if (!results || results.length === 0) {
		if (!results) return null;
		return (
			<div
				className={`liquid-glass ${styles.container}`}
				style={{
					padding: 24,
					borderRadius: 16,
					height: "auto",
					bottom: "auto",
				}}
			>
				<div className={styles.header}>
					<span className={styles.headerTitle}>Results</span>
				</div>
				<div
					style={{
						padding: "20px",
						color: "#71717a",
						fontSize: "0.85rem",
						textAlign: "center",
					}}
				>
					No matches found. Try different keywords or check if your
					data is seeded with embeddings.
				</div>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<span className={styles.headerTitle}>Results</span>
				<span className={styles.headerCount}>
					{results.length} found
				</span>
			</div>
			<div className={styles.list}>
				{results.map((result, index) => {
					// Use entity_type for color, fallback to category for backward compat
					const colorKey =
						result.entity_type || result.category || "General";
					const color =
						ENTITY_COLORS[colorKey] || ENTITY_COLORS.General;

					return (
						<div
							key={result.id}
							className={`liquid-glass ${styles.card}`}
							style={{
								animationDelay: `${index * 80}ms`,
								borderLeftColor: color,
							}}
							onMouseEnter={() => onHoverResult?.(result.id)}
							onMouseLeave={() => onHoverResult?.(null)}
							onClick={() => onSelectResult?.(result)}
						>
							<div className={styles.cardTop}>
								<h3 className={styles.cardTitle}>
									{result.title}
								</h3>
								<span
									className={styles.badge}
									style={{
										color: color,
										borderColor: color,
									}}
								>
									{colorKey}
								</span>
							</div>
							<p className={styles.cardContent}>
								{result.content?.slice(0, 120)}
								{result.content?.length > 120 ? "..." : ""}
							</p>
							<div className={styles.cardBottom}>
								<div className={styles.similarityWrap}>
									<div className={styles.similarityTrack}>
										<div
											className={styles.similarityFill}
											style={{
												width: `${Math.round((result.similarity || 0) * 100)}%`,
											}}
										/>
									</div>
									<span className={styles.similarityText}>
										{Math.round(
											(result.similarity || 0) * 100
										)}
										% match
									</span>
								</div>
								<button
									className={styles.deleteBtn}
									onClick={(e) => {
										e.stopPropagation();
										onDeleteRecord?.(result.id);
									}}
									title="Delete record"
								>
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<polyline points="3 6 5 6 21 6" />
										<path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" />
										<path d="M10 11v6M14 11v6" />
									</svg>
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
