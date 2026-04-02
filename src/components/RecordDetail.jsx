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

/**
 * Compute all related entities for a given record.
 * Uses the in-memory records array — no extra database calls needed.
 */
function computeRelated(record, allRecords) {
	if (!record || !allRecords || allRecords.length === 0) return {};

	const type = record.entity_type || record.category;
	const id = record.id;
	const meta = record.metadata || {};
	const groups = {};

	if (type === "Teacher") {
		// Subjects this teacher teaches
		const subjects = allRecords.filter(
			(r) => r.entity_type === "Subject" && r.metadata?.teacher_id === id
		);
		if (subjects.length > 0) groups["Subjects Taught"] = { type: "Subject", items: subjects };

		// Courses they teach in (derived from subjects)
		const courseIds = new Set(
			subjects.map((s) => s.metadata?.course_id).filter(Boolean)
		);
		const courses = allRecords.filter(
			(r) => r.entity_type === "Course" && courseIds.has(r.id)
		);
		if (courses.length > 0) groups["Courses"] = { type: "Course", items: courses };

		// Students in those courses
		const students = allRecords.filter(
			(r) => r.entity_type === "Student" && courseIds.has(r.metadata?.course_id)
		);
		if (students.length > 0) groups["Students"] = { type: "Student", items: students };

	} else if (type === "Course") {
		// Students enrolled in this course
		const students = allRecords.filter(
			(r) => r.entity_type === "Student" && r.metadata?.course_id === id
		);
		if (students.length > 0) groups["Enrolled Students"] = { type: "Student", items: students };

		// Subjects in this course
		const subjects = allRecords.filter(
			(r) => r.entity_type === "Subject" && r.metadata?.course_id === id
		);
		if (subjects.length > 0) groups["Subjects"] = { type: "Subject", items: subjects };

		// Teachers who teach subjects in this course
		const teacherIds = new Set(
			subjects.map((s) => s.metadata?.teacher_id).filter(Boolean)
		);
		const teachers = allRecords.filter(
			(r) => r.entity_type === "Teacher" && teacherIds.has(r.id)
		);
		if (teachers.length > 0) groups["Faculty"] = { type: "Teacher", items: teachers };

	} else if (type === "Subject") {
		// The course this subject belongs to
		if (meta.course_id) {
			const course = allRecords.filter((r) => r.id === meta.course_id);
			if (course.length > 0) groups["Course"] = { type: "Course", items: course };
		}
		// The teacher who teaches this subject
		if (meta.teacher_id) {
			const teacher = allRecords.filter((r) => r.id === meta.teacher_id);
			if (teacher.length > 0) groups["Instructor"] = { type: "Teacher", items: teacher };
		}
		// Students in the same course
		if (meta.course_id) {
			const classmates = allRecords.filter(
				(r) => r.entity_type === "Student" && r.metadata?.course_id === meta.course_id
			);
			if (classmates.length > 0) groups["Students in Course"] = { type: "Student", items: classmates };
		}

	} else if (type === "Student") {
		// Their course
		if (meta.course_id) {
			const course = allRecords.filter((r) => r.id === meta.course_id);
			if (course.length > 0) groups["Enrolled In"] = { type: "Course", items: course };

			// Subjects in the same course
			const subjects = allRecords.filter(
				(r) => r.entity_type === "Subject" && r.metadata?.course_id === meta.course_id
			);
			if (subjects.length > 0) groups["Subjects"] = { type: "Subject", items: subjects };

			// Classmates
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

	// Show first 5 when collapsed, all when expanded
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
}) {
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

			{/* Title */}
			<h2 className={styles.title}>{record.title}</h2>

			{/* Content description */}
			<p className={styles.content}>{record.content}</p>

			{/* Metadata key-value pairs */}
			{record.metadata && Object.keys(record.metadata).length > 0 && (
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

			{/* ==========================================
			    RELATED ENTITIES SECTION
			    ========================================== */}
			{relatedGroups.length > 0 && (
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
			<button
				className={styles.deleteBtn}
				onClick={() => {
					onDelete?.(record.id);
					onClose?.();
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
					e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
					e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.25)";
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
		</div>
	);
}
