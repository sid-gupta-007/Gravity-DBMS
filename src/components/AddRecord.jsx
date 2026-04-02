import React, { useState, useEffect } from "react";
import styles from "./AddRecord.module.css";

const ENTITY_TYPES = ["Student", "Course", "Subject", "Teacher", "Custom"];
const DEPARTMENTS = ["B.Tech", "M.Tech", "B.Sc", "M.Sc", "MBA", "BBA", "BA", "B.Des"];

export default function AddRecord({ onAdd, isAdding, hasResults, isOpen, setIsOpen, courses = [], teachers = [] }) {
	const [entityType, setEntityType] = useState("Student");
	const [name, setName] = useState("");
	const [courseId, setCourseId] = useState("");
	const [teacherId, setTeacherId] = useState("");
	const [department, setDepartment] = useState("B.Tech");
	const [customType, setCustomType] = useState("");
	const [metaKey, setMetaKey] = useState("");
	const [metaVal, setMetaVal] = useState("");
	const [metaPairs, setMetaPairs] = useState([]);
	const [mapUrl, setMapUrl] = useState(null);

	// Fetch displacement map for the crystal button
	useEffect(() => {
		fetch("https://essykings.github.io/JavaScript/map.png")
			.then((response) => response.blob())
			.then((blob) => {
				const objURL = URL.createObjectURL(blob);
				setMapUrl(objURL);
			})
			.catch((err) => console.error("Failed to load displacement map:", err));

		return () => {
			if (mapUrl) URL.revokeObjectURL(mapUrl);
		};
	}, []);

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
		if (!name.trim()) return;

		// Build metadata from pairs
		const metadata = {};
		metaPairs.forEach(([k, v]) => {
			if (!isNaN(v) && v !== "") metadata[k] = Number(v);
			else if (v === "true") metadata[k] = true;
			else if (v === "false") metadata[k] = false;
			else metadata[k] = v;
		});

		await onAdd?.({
			entityType,
			name: name.trim(),
			courseId: courseId || undefined,
			teacherId: teacherId || undefined,
			department: department || undefined,
			customType: customType.trim() || undefined,
			metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
		});

		// Reset form
		setName("");
		setCourseId("");
		setTeacherId("");
		setCustomType("");
		setMetaPairs([]);
		setIsOpen(false);
	};

	// Placeholder text for name field based on entity type
	const namePlaceholder = {
		Student: "e.g. Priya Sharma",
		Course: "e.g. Computer Science",
		Subject: "e.g. Data Structures & Algorithms",
		Teacher: "e.g. Prof. Rajesh Kumar",
		Custom: "e.g. Physics Lab 201",
	}[entityType] || "Name";

	if (!isOpen) {
		return (
			<>
				<button
					className={`${styles.glassButton} ${hasResults ? styles.glassButtonMoved : ""}`}
					onClick={() => setIsOpen(true)}
					title="Add new record"
				>
					<span>+</span>
				</button>

				<svg style={{ position: "absolute", width: 0, height: 0 }}>
					<filter
						id="glass"
						x="-50%"
						y="-50%"
						width="200%"
						height="200%"
						primitiveUnits="objectBoundingBox"
					>
						{mapUrl && (
							<feImage
								href={mapUrl}
								x="-50%"
								y="-50%"
								width="200%"
								height="200%"
								result="map"
							/>
						)}
						<feGaussianBlur in="SourceGraphic" stdDeviation="0.02" result="blur" />
						<feDisplacementMap
							id="disp"
							in="blur"
							in2="map"
							scale="0.8"
							xChannelSelector="R"
							yChannelSelector="G"
						/>
					</filter>
				</svg>
			</>
		);
	}

	return (
		<div className={styles.overlay} onClick={() => setIsOpen(false)}>
			<form
				className={`liquid-glass ${styles.modal}`}
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

				{/* Entity Type Selector */}
				<label className={styles.label}>Record Type</label>
				<div className={styles.catRow}>
					{ENTITY_TYPES.map((type) => (
						<button
							key={type}
							type="button"
							className={`${styles.catBtn} ${entityType === type ? styles.catBtnActive : ""}`}
							onClick={() => {
								setEntityType(type);
								setCourseId("");
								setTeacherId("");
							}}
						>
							{type}
						</button>
					))}
				</div>

				{/* Name (always shown) */}
				<label className={styles.label}>Name</label>
				<input
					type="text"
					className={styles.input}
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder={namePlaceholder}
					required
				/>

				{/* Department dropdown (for Course) */}
				{entityType === "Course" && (
					<>
						<label className={styles.label}>Department</label>
						<select
							className={styles.input}
							value={department}
							onChange={(e) => setDepartment(e.target.value)}
						>
							{DEPARTMENTS.map((d) => (
								<option key={d} value={d}>
									{d}
								</option>
							))}
						</select>
					</>
				)}

				{/* Course dropdown (for Student, Subject) */}
				{(entityType === "Student" || entityType === "Subject") && (
					<>
						<label className={styles.label}>
							Course
							{entityType === "Student" && (
								<span className={styles.optional}> (assign to a program)</span>
							)}
						</label>
						<select
							className={styles.input}
							value={courseId}
							onChange={(e) => setCourseId(e.target.value)}
						>
							<option value="">Select Course...</option>
							{courses.map((c) => (
								<option key={c.id} value={c.id}>
									{c.title}
								</option>
							))}
						</select>
					</>
				)}

				{/* Teacher dropdown (for Subject) */}
				{entityType === "Subject" && (
					<>
						<label className={styles.label}>
							Teacher
							<span className={styles.optional}> (assign instructor)</span>
						</label>
						<select
							className={styles.input}
							value={teacherId}
							onChange={(e) => setTeacherId(e.target.value)}
						>
							<option value="">Select Teacher...</option>
							{teachers.map((t) => (
								<option key={t.id} value={t.id}>
									{t.title}
								</option>
							))}
						</select>
					</>
				)}

				{/* Custom entity type name */}
				{entityType === "Custom" && (
					<>
						<label className={styles.label}>Entity Type Name</label>
						<input
							type="text"
							className={styles.input}
							value={customType}
							onChange={(e) => setCustomType(e.target.value)}
							placeholder="e.g. Lab, Equipment, Club, Event"
							required
						/>
					</>
				)}

				{/* Metadata (for Custom, or optional for others) */}
				{(entityType === "Custom" || entityType === "Teacher") && (
					<>
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
					</>
				)}

				<button
					type="submit"
					className={styles.submitBtn}
					disabled={isAdding || !name.trim() || (entityType === "Custom" && !customType.trim())}
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
