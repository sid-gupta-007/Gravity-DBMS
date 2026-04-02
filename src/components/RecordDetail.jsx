import React, { useMemo, useState } from "react";
import styles from "./RecordDetail.module.css";

const ENTITY_COLORS = {
	Course: "#9db4ff",
	Subject: "#baccff",
	Teacher: "#fff5ec",
	Student: "#ffbe7f",
	General: "#6ee7b7",
};

const ENTITY_ICONS = {
	Course: "🎓",
	Subject: "📚",
	Teacher: "👨‍🏫",
	Student: "🧑‍🎓",
};

const DEPARTMENTS = ["B.Tech", "M.Tech", "B.Sc", "M.Sc", "MBA", "BBA", "BA", "B.Des"];

/**
 * Compute all related entities for a given record.
 */
function computeRelated(record, allRecords) {
	if (!record || !allRecords || allRecords.length === 0) return {};

	const type = record.entity_type || record.category;
	const id = record.id;
	const meta = record.metadata || {};
	const groups = {};

	if (type === "Teacher") {
		const subjects = allRecords.filter(
			(r) => r.entity_type === "Subject" && r.metadata?.teacher_id === id
		);
		if (subjects.length > 0) groups["Subjects Taught"] = { type: "Subject", items: subjects };

		const courseIds = new Set(
			subjects.map((s) => s.metadata?.course_id).filter(Boolean)
		);
		const courses = allRecords.filter(
			(r) => r.entity_type === "Course" && courseIds.has(r.id)
		);
		if (courses.length > 0) groups["Courses"] = { type: "Course", items: courses };

		const students = allRecords.filter(
			(r) => r.entity_type === "Student" && courseIds.has(r.metadata?.course_id)
		);
		if (students.length > 0) groups["Students"] = { type: "Student", items: students };

	} else if (type === "Course") {
		const students = allRecords.filter(
			(r) => r.entity_type === "Student" && r.metadata?.course_id === id
		);
		if (students.length > 0) groups["Enrolled Students"] = { type: "Student", items: students };

		const subjects = allRecords.filter(
			(r) => r.entity_type === "Subject" && r.metadata?.course_id === id
		);
		if (subjects.length > 0) groups["Subjects"] = { type: "Subject", items: subjects };

		const teacherIds = new Set(
			subjects.map((s) => s.metadata?.teacher_id).filter(Boolean)
		);
		const teachers = allRecords.filter(
			(r) => r.entity_type === "Teacher" && teacherIds.has(r.id)
		);
		if (teachers.length > 0) groups["Faculty"] = { type: "Teacher", items: teachers };

	} else if (type === "Subject") {
		if (meta.course_id) {
			const course = allRecords.filter((r) => r.id === meta.course_id);
			if (course.length > 0) groups["Course"] = { type: "Course", items: course };
		}
		if (meta.teacher_id) {
			const teacher = allRecords.filter((r) => r.id === meta.teacher_id);
			if (teacher.length > 0) groups["Instructor"] = { type: "Teacher", items: teacher };
		}
		if (meta.course_id) {
			const classmates = allRecords.filter(
				(r) => r.entity_type === "Student" && r.metadata?.course_id === meta.course_id
			);
			if (classmates.length > 0) groups["Students in Course"] = { type: "Student", items: classmates };
		}

	} else if (type === "Student") {
		if (meta.course_id) {
			const course = allRecords.filter((r) => r.id === meta.course_id);
			if (course.length > 0) groups["Enrolled In"] = { type: "Course", items: course };

			const subjects = allRecords.filter(
				(r) => r.entity_type === "Subject" && r.metadata?.course_id === meta.course_id
			);
			if (subjects.length > 0) groups["Subjects"] = { type: "Subject", items: subjects };

			const classmates = allRecords.filter(
				(r) =>
					r.entity_type === "Student" &&
					r.metadata?.course_id === meta.course_id &&
					r.id !== id
			);
			if (classmates.length > 0) groups["Classmates"] = { type: "Student", items: classmates };
		}
	}

	return groups;
}

/**
 * A single collapsible relationship section
 */
function RelationSection({ label, group, onNavigate }) {
	const [isOpen, setIsOpen] = useState(false);
	const { type, items } = group;
	const color = ENTITY_COLORS[type] || ENTITY_COLORS.General;
	const icon = ENTITY_ICONS[type] || "📋";

	const MAX_COLLAPSED = 5;
	const showItems = isOpen ? items : items.slice(0, MAX_COLLAPSED);
	const hasMore = items.length > MAX_COLLAPSED;

	return (
		<div className={styles.section}>
			<button
				className={styles.sectionHeader}
				onClick={() => setIsOpen(!isOpen)}
			>
				<div className={styles.sectionLeft}>
					<span className={styles.sectionIcon}>{icon}</span>
					<span className={styles.sectionLabel}>{label}</span>
				</div>
				<div className={styles.sectionRight}>
					<span
						className={styles.sectionCount}
						style={{ color, borderColor: `${color}66` }}
					>
						{items.length}
					</span>
					<span
						className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
					>
						▸
					</span>
				</div>
			</button>

			<div className={`${styles.sectionBody} ${isOpen || items.length <= MAX_COLLAPSED ? styles.sectionBodyOpen : ""}`}>
				{showItems.map((item) => (
					<button
						key={item.id}
						className={styles.relatedItem}
						onClick={() => onNavigate?.(item)}
						title={`View ${item.title}`}
					>
						<span
							className={styles.relatedDot}
							style={{ background: color }}
						/>
						<span className={styles.relatedName}>
							{item.title}
						</span>
						<span className={styles.relatedType}>{item.entity_type}</span>
					</button>
				))}
				{!isOpen && hasMore && (
					<button
						className={styles.showMore}
						onClick={() => setIsOpen(true)}
					>
						+ {items.length - MAX_COLLAPSED} more {label.toLowerCase()}
					</button>
				)}
			</div>
		</div>
	);
}

export default function RecordDetail({
	record,
	allRecords,
	onClose,
	onDelete,
	onNavigate,
	onUpdate,
	courses = [],
	teachers = [],
}) {
	const [isEditing, setIsEditing] = useState(false);
	const [editName, setEditName] = useState("");
	const [editDepartment, setEditDepartment] = useState("");
	const [editCourseId, setEditCourseId] = useState("");
	const [editTeacherId, setEditTeacherId] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	if (!record) return null;

	const related = useMemo(
		() => computeRelated(record, allRecords),
		[record, allRecords]
	);

	const entityType = record.entity_type || record.category || "General";
	const color = ENTITY_COLORS[entityType] || ENTITY_COLORS.General;
	const relatedGroups = Object.entries(related);
	const totalRelated = relatedGroups.reduce(
		(sum, [, g]) => sum + g.items.length,
		0
	);

	const startEditing = () => {
		setEditName(record.title || "");
		setEditDepartment(record.metadata?.department || "B.Tech");
		setEditCourseId(record.metadata?.course_id || "");
		setEditTeacherId(record.metadata?.teacher_id || "");
		setIsEditing(true);
	};

	const cancelEditing = () => {
		setIsEditing(false);
	};

	const saveEdits = async () => {
		if (!editName.trim()) return;
		setIsSaving(true);

		const updates = {};
		if (editName.trim() !== record.title) updates.name = editName.trim();
		if (entityType === "Course" && editDepartment !== record.metadata?.department) {
			updates.department = editDepartment;
		}
		if ((entityType === "Student" || entityType === "Subject") && editCourseId !== record.metadata?.course_id) {
			updates.courseId = editCourseId || null;
		}
		if (entityType === "Subject" && editTeacherId !== record.metadata?.teacher_id) {
			updates.teacherId = editTeacherId || null;
		}

		if (Object.keys(updates).length > 0) {
			await onUpdate?.(record.id, updates);
		}

		setIsSaving(false);
		setIsEditing(false);
	};

	return (
		<div className={`liquid-glass ${styles.container}`}>
			{/* Close button */}
			<button className={styles.closeBtn} onClick={onClose}>
				✕
			</button>

			{/* Entity type badge */}
			<div className={styles.typeBadge} style={{ color }}>
				{entityType}
			</div>

			{/* Title (or edit input) */}
			{isEditing ? (
				<input
					type="text"
					className={styles.editInput}
					value={editName}
					onChange={(e) => setEditName(e.target.value)}
					autoFocus
				/>
			) : (
				<h2 className={styles.title}>{record.title}</h2>
			)}

			{/* Content description */}
			<p className={styles.content}>{record.content}</p>

			{/* Entity-specific edit fields */}
			{isEditing && (
				<div className={styles.editBlock}>
					{entityType === "Course" && (
						<>
							<label className={styles.editLabel}>Department</label>
							<select
								className={styles.editInput}
								value={editDepartment}
								onChange={(e) => setEditDepartment(e.target.value)}
							>
								{DEPARTMENTS.map((d) => (
									<option key={d} value={d}>{d}</option>
								))}
							</select>
						</>
					)}
					{(entityType === "Student" || entityType === "Subject") && (
						<>
							<label className={styles.editLabel}>Course</label>
							<select
								className={styles.editInput}
								value={editCourseId}
								onChange={(e) => setEditCourseId(e.target.value)}
							>
								<option value="">None</option>
								{courses.map((c) => (
									<option key={c.id} value={c.id}>{c.title}</option>
								))}
							</select>
						</>
					)}
					{entityType === "Subject" && (
						<>
							<label className={styles.editLabel}>Teacher</label>
							<select
								className={styles.editInput}
								value={editTeacherId}
								onChange={(e) => setEditTeacherId(e.target.value)}
							>
								<option value="">None</option>
								{teachers.map((t) => (
									<option key={t.id} value={t.id}>{t.title}</option>
								))}
							</select>
						</>
					)}
				</div>
			)}

			{/* Edit / Save / Cancel buttons */}
			{isEditing ? (
				<div className={styles.editActions}>
					<button
						className={styles.saveBtn}
						onClick={saveEdits}
						disabled={isSaving || !editName.trim()}
					>
						{isSaving ? "Saving..." : "✓ Save"}
					</button>
					<button
						className={styles.cancelBtn}
						onClick={cancelEditing}
						disabled={isSaving}
					>
						Cancel
					</button>
				</div>
			) : (
				<button className={styles.editBtn} onClick={startEditing}>
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
						<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
					</svg>
					Edit Record
				</button>
			)}

			{/* Metadata key-value pairs */}
			{!isEditing && record.metadata && Object.keys(record.metadata).length > 0 && (
				<div className={styles.metaBlock}>
					<div className={styles.metaLabel}>Metadata</div>
					{Object.entries(record.metadata).map(([key, val]) => (
						<div key={key} className={styles.metaRow}>
							<span className={styles.metaKey}>{key}</span>
							<span className={styles.metaVal}>
								{Array.isArray(val) ? val.join(", ") : String(val)}
							</span>
						</div>
					))}
				</div>
			)}

			{/* RELATED ENTITIES */}
			{!isEditing && relatedGroups.length > 0 && (
				<div className={styles.relatedBlock}>
					<div className={styles.relatedHeader}>
						<span className={styles.relatedHeaderTitle}>
							Relationships
						</span>
						<span className={styles.relatedHeaderCount}>
							{totalRelated} linked
						</span>
					</div>

					{relatedGroups.map(([label, group]) => (
						<RelationSection
							key={label}
							label={label}
							group={group}
							onNavigate={onNavigate}
						/>
					))}
				</div>
			)}

			{/* Delete button */}
			{!isEditing && (
				<button
					className={styles.deleteBtn}
					onClick={() => {
						onDelete?.(record.id);
						onClose?.();
					}}
				>
					<svg
						width="14"
						height="14"
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
					Delete Record
				</button>
			)}
		</div>
	);
}
