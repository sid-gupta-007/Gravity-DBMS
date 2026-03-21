import React, { useState } from "react";
import styles from "./AddRecord.module.css";

const CATEGORIES = ["Engineering", "Marketing", "Design", "General"];

export default function AddRecord({ onAdd, isAdding }) {
	const [isOpen, setIsOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [category, setCategory] = useState("Engineering");
	const [metaKey, setMetaKey] = useState("");
	const [metaVal, setMetaVal] = useState("");
	const [metaPairs, setMetaPairs] = useState([]);

	const handleAddMeta = () => {
		if (!metaKey.trim()) return;
		setMetaPairs((prev) => [...prev, [metaKey.trim(), metaVal.trim()]]);
		setMetaKey("");
		setMetaVal("");
	};

	const handleRemoveMeta = (idx) => {
		setMetaPairs((prev) => prev.filter((_, i) => i !== idx));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!title.trim() || !content.trim()) return;

		const metadata = {};
		metaPairs.forEach(([k, v]) => {
			// Try to parse numbers/booleans
			if (!isNaN(v) && v !== "") metadata[k] = Number(v);
			else if (v === "true") metadata[k] = true;
			else if (v === "false") metadata[k] = false;
			else metadata[k] = v;
		});

		await onAdd?.({ title: title.trim(), content: content.trim(), category, metadata });

		// Reset
		setTitle("");
		setContent("");
		setCategory("Engineering");
		setMetaPairs([]);
		setIsOpen(false);
	};

	if (!isOpen) {
		return (
			<button
				className={styles.fab}
				onClick={() => setIsOpen(true)}
				title="Add new record"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M12 5v14M5 12h14" />
				</svg>
			</button>
		);
	}

	return (
		<div className={styles.overlay} onClick={() => setIsOpen(false)}>
			<form
				className={styles.modal}
				onClick={(e) => e.stopPropagation()}
				onSubmit={handleSubmit}
			>
				<div className={styles.header}>
					<h2 className={styles.headerTitle}>Create a New Star</h2>
					<button
						type="button"
						className={styles.closeBtn}
						onClick={() => setIsOpen(false)}
					>
						✕
					</button>
				</div>

				<label className={styles.label}>Title</label>
				<input
					type="text"
					className={styles.input}
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					placeholder="e.g. Ram Sharma"
					required
				/>

				<label className={styles.label}>Content</label>
				<textarea
					className={styles.textarea}
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder="Describe this record... The more detail, the better the semantic search."
					rows={4}
					required
				/>

				<label className={styles.label}>Category</label>
				<div className={styles.catRow}>
					{CATEGORIES.map((cat) => (
						<button
							key={cat}
							type="button"
							className={`${styles.catBtn} ${category === cat ? styles.catBtnActive : ""}`}
							onClick={() => setCategory(cat)}
						>
							{cat}
						</button>
					))}
				</div>

				<label className={styles.label}>
					Metadata <span className={styles.optional}>(optional)</span>
				</label>
				<div className={styles.metaRow}>
					<input
						type="text"
						className={styles.metaInput}
						value={metaKey}
						onChange={(e) => setMetaKey(e.target.value)}
						placeholder="key"
					/>
					<input
						type="text"
						className={styles.metaInput}
						value={metaVal}
						onChange={(e) => setMetaVal(e.target.value)}
						placeholder="value"
					/>
					<button
						type="button"
						className={styles.metaAddBtn}
						onClick={handleAddMeta}
					>
						+
					</button>
				</div>
				{metaPairs.length > 0 && (
					<div className={styles.metaTags}>
						{metaPairs.map(([k, v], i) => (
							<span key={i} className={styles.metaTag}>
								{k}: {v}
								<button
									type="button"
									className={styles.metaTagX}
									onClick={() => handleRemoveMeta(i)}
								>
									×
								</button>
							</span>
						))}
					</div>
				)}

				<button
					type="submit"
					className={styles.submitBtn}
					disabled={isAdding || !title.trim() || !content.trim()}
				>
					{isAdding ? "Creating Star..." : "✦ Launch Star"}
				</button>
				<p className={styles.hint}>
					An embedding will be auto-generated for semantic search.
				</p>
			</form>
		</div>
	);
}
