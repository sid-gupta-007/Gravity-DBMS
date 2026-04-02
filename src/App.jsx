import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import Universe from "./components/Universe";
import ChatInterface from "./components/ChatInterface";
import SearchResults from "./components/SearchResults";
import AddRecord from "./components/AddRecord";
import RecordDetail from "./components/RecordDetail";
import { supabase } from "./lib/supabase";
import { generateEmbedding } from "./lib/embeddings";

export default function App() {
	const [records, setRecords] = useState([]);
	const [searchResults, setSearchResults] = useState(null);
	const [isSearching, setIsSearching] = useState(false);
	const [highlightedId, setHighlightedId] = useState(null);
	const [deletingId, setDeletingId] = useState(null);
	const [selectedRecord, setSelectedRecord] = useState(null);
	const [error, setError] = useState(null);
	const [isAdding, setIsAdding] = useState(false);
	const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);

	// Derived: courses and teachers lists for AddRecord dropdowns
	const coursesList = useMemo(
		() => records.filter((r) => r.entity_type === "Course"),
		[records]
	);
	const teachersList = useMemo(
		() => records.filter((r) => r.entity_type === "Teacher"),
		[records]
	);

	// Fetch all records on mount
	useEffect(() => {
		fetchRecords();
	}, []);

	const fetchRecords = async () => {
		const { data, error: err } = await supabase.rpc("get_all_entities");

		if (err) {
			console.error("Failed to fetch records:", err);
			setError("Failed to connect to database. Have you run the schema.sql?");
			return;
		}

		const formattedData = (data || []).map((d) => ({
			...d,
			category: d.entity_type,
		}));

		setRecords(formattedData);
	};

	// ==========================================
	// HYBRID SEARCH (Vector + Keyword)
	// ==========================================
	const handleSearch = useCallback(async (query) => {
		setIsSearching(true);
		setError(null);
		try {
			// Run vector embedding generation and keyword search in parallel
			const embeddingPromise = generateEmbedding(query);
			const keywordPromise = supabase.rpc("keyword_search_entities", {
				query_text: query,
				max_results: 20,
			});

			const [embedding, keywordResult] = await Promise.all([
				embeddingPromise,
				keywordPromise,
			]);

			// Now run vector search
			const { data: vectorData, error: vecErr } = await supabase.rpc(
				"match_entities",
				{
					query_embedding: embedding,
					match_count: 20,
					match_threshold: 0.15, // Lower threshold for better recall
				}
			);

			if (vecErr) throw vecErr;

			// Merge results: keyword matches get priority
			const merged = new Map();

			// Keyword matches get high similarity boost
			(keywordResult.data || []).forEach((r) => {
				merged.set(r.id, {
					...r,
					category: r.entity_type,
					similarity: 0.95, // Keyword matches are highly relevant
				});
			});

			// Vector matches fill gaps and boost existing
			(vectorData || []).forEach((r) => {
				if (merged.has(r.id)) {
					// Already found by keyword — boost further
					const existing = merged.get(r.id);
					existing.similarity = Math.min(
						existing.similarity + r.similarity * 0.3,
						1.0
					);
				} else {
					merged.set(r.id, {
						...r,
						category: r.entity_type,
					});
				}
			});

			// Sort by similarity descending, filter to 60%+ matches only
			const results = Array.from(merged.values())
				.filter((r) => r.similarity >= 0.60)
				.sort((a, b) => b.similarity - a.similarity);

			setSearchResults(results);
		} catch (err) {
			console.error("Search failed:", err);
			setError("Search failed. Check console for details.");
			setSearchResults([]);
		} finally {
			setIsSearching(false);
		}
	}, []);

	// Reset search
	const handleReset = useCallback(() => {
		setSearchResults(null);
		setHighlightedId(null);
		setSelectedRecord(null);
	}, []);

	// Delete record with supernova animation
	const handleDelete = useCallback(async (id) => {
		setDeletingId(id);
	}, []);

	// After supernova animation completes
	const handleDeleteComplete = useCallback(
		async (id) => {
			const record = records.find((r) => r.id === id);
			if (!record) return;

			let table = "students";
			let pkCol = "roll_no";

			if (record.entity_type === "Course") {
				table = "courses";
				pkCol = "course_id";
			} else if (record.entity_type === "Teacher") {
				table = "teachers";
				pkCol = "teacher_id";
			} else if (record.entity_type === "Subject") {
				table = "subjects";
				pkCol = "subject_id";
			} else if (!["Student", "Course", "Teacher", "Subject"].includes(record.entity_type)) {
				// Custom entity
				table = "custom_entities";
				pkCol = "id";
			}

			const { error: err } = await supabase
				.from(table)
				.delete()
				.eq(pkCol, id);

			if (err) {
				console.error("Delete failed:", err);
			} else {
				setRecords((prev) => prev.filter((r) => r.id !== id));
				setSearchResults((prev) =>
					prev ? prev.filter((r) => r.id !== id) : null
				);
				// Clear selection if the deleted record was selected
				if (selectedRecord?.id === id) {
					setSelectedRecord(null);
				}
			}
			setDeletingId(null);
		},
		[records, selectedRecord]
	);

	// ==========================================
	// ADD RECORD (entity-type aware)
	// ==========================================
	const handleAddRecord = useCallback(
		async ({ entityType, name, courseId, teacherId, department, customType, metadata }) => {
			setIsAdding(true);
			setError(null);
			try {
				let table = "";
				let record = {};
				let embText = "";

				switch (entityType) {
					case "Student": {
						table = "students";
						const courseName =
							records.find((r) => r.id === courseId)?.title || "";
						embText = `Student ${name}, enrolled in ${courseName}. University student.`;
						record = {
							roll_no: `STD-${Date.now()}`,
							name,
							course_id: courseId || null,
						};
						break;
					}
					case "Course": {
						table = "courses";
						embText = `${department} ${name}. A ${department} degree program in ${name}, covering core and advanced topics.`;
						record = {
							course_id: `CRS-${Date.now()}`,
							name,
							department: department || "B.Tech",
						};
						break;
					}
					case "Subject": {
						table = "subjects";
						const cName =
							records.find((r) => r.id === courseId)?.title || "";
						const tName =
							records.find((r) => r.id === teacherId)?.title || "";
						embText = `Subject: ${name}. Taught in the ${cName} program by ${tName}. Academic subject.`;
						record = {
							subject_id: `SUB-${Date.now()}`,
							name,
							course_id: courseId || null,
							teacher_id: teacherId || null,
						};
						break;
					}
					case "Teacher": {
						table = "teachers";
						embText = `Professor ${name}, faculty member specializing in teaching and research in higher education.`;
						record = {
							teacher_id: `TCH-${Date.now()}`,
							name,
						};
						break;
					}
					default: {
						// Custom entity type
						table = "custom_entities";
						const metaStr = metadata
							? Object.entries(metadata)
									.map(([k, v]) => `${k}: ${v}`)
									.join(", ")
							: "";
						embText = `${customType || entityType} ${name}. ${metaStr}`;
						record = {
							id: `CUSTOM-${Date.now()}`,
							entity_type: customType || entityType,
							name,
							data: metadata || {},
						};
						break;
					}
				}

				const embedding = await generateEmbedding(embText);
				record.embedding = embedding;

				const { error: insertErr } = await supabase
					.from(table)
					.insert([record])
					.select();

				if (insertErr) throw insertErr;
				await fetchRecords();
			} catch (err) {
				console.error("Add record failed:", err);
				setError("Failed to add record. Check console.");
			} finally {
				setIsAdding(false);
			}
		},
		[records]
	);

	// ==========================================
	// UPDATE RECORD
	// ==========================================
	const getTableInfo = (record) => {
		let table = "students", pkCol = "roll_no";
		if (record.entity_type === "Course") { table = "courses"; pkCol = "course_id"; }
		else if (record.entity_type === "Teacher") { table = "teachers"; pkCol = "teacher_id"; }
		else if (record.entity_type === "Subject") { table = "subjects"; pkCol = "subject_id"; }
		else if (!["Student", "Course", "Teacher", "Subject"].includes(record.entity_type)) {
			table = "custom_entities"; pkCol = "id";
		}
		return { table, pkCol };
	};

	const handleUpdateRecord = useCallback(
		async (id, updates) => {
			const record = records.find((r) => r.id === id);
			if (!record) return;

			const { table, pkCol } = getTableInfo(record);
			const updateData = {};

			if (updates.name !== undefined) updateData.name = updates.name;
			if (updates.department !== undefined) updateData.department = updates.department;
			if (updates.courseId !== undefined) updateData.course_id = updates.courseId;
			if (updates.teacherId !== undefined) updateData.teacher_id = updates.teacherId;

			// Regenerate embedding with new info
			const newName = updates.name || record.title;
			let embText = newName;
			if (record.entity_type === "Course") {
				const dept = updates.department || record.metadata?.department || "B.Tech";
				embText = `${dept} ${newName}. A ${dept} degree program in ${newName}.`;
			} else if (record.entity_type === "Student") {
				const cId = updates.courseId || record.metadata?.course_id;
				const cName = records.find((r) => r.id === cId)?.title || "";
				embText = `Student ${newName}, enrolled in ${cName}.`;
			} else if (record.entity_type === "Subject") {
				const cId = updates.courseId || record.metadata?.course_id;
				const cName = records.find((r) => r.id === cId)?.title || "";
				embText = `Subject: ${newName}. Taught in the ${cName} program.`;
			} else if (record.entity_type === "Teacher") {
				embText = `Professor ${newName}, faculty member.`;
			}

			try {
				updateData.embedding = await generateEmbedding(embText);
				const { error: err } = await supabase
					.from(table)
					.update(updateData)
					.eq(pkCol, id);

				if (err) throw err;
				await fetchRecords();

				// Refresh selected record with new data
				const { data: refreshed } = await supabase.rpc("get_all_entities");
				const updated = (refreshed || []).find((r) => r.id === id);
				if (updated) setSelectedRecord({ ...updated, category: updated.entity_type });
			} catch (err) {
				console.error("Update failed:", err);
				setError("Failed to update record.");
			}
		},
		[records]
	);

	return (
		<div
			style={{
				width: "100vw",
				height: "100vh",
				background: "#050505",
				position: "relative",
			}}
		>
			<Canvas camera={{ position: [0, 0, 80], fov: 60 }}>
				<color attach="background" args={["#020202"]} />
				<Universe
					records={records}
					searchResults={searchResults}
					highlightedId={highlightedId}
					deletingId={deletingId}
					onDeleteComplete={handleDeleteComplete}
					onStarClick={setSelectedRecord}
					selectedRecordId={selectedRecord?.id}
					hideLabels={isAddRecordOpen}
				/>
				<OrbitControls makeDefault enableDamping dampingFactor={0.05} />
				<EffectComposer disableNormalPass>
					<Bloom
						luminanceThreshold={0.4}
						mipmapBlur
						intensity={0.6}
						radius={0.4}
					/>
				</EffectComposer>
			</Canvas>

			{/* Chat Interface overlay */}
			<ChatInterface
				onSearch={handleSearch}
				onReset={handleReset}
				isSearching={isSearching}
				hasResults={searchResults !== null && searchResults.length > 0}
			/>

			{/* Add Record FAB + Modal */}
			<AddRecord
				onAdd={handleAddRecord}
				isAdding={isAdding}
				hasResults={searchResults !== null && searchResults.length > 0}
				isOpen={isAddRecordOpen}
				setIsOpen={setIsAddRecordOpen}
				courses={coursesList}
				teachers={teachersList}
			/>

			{/* Search Results panel */}
			<SearchResults
				results={searchResults}
				onDeleteRecord={handleDelete}
				onHoverResult={setHighlightedId}
				onSelectResult={setSelectedRecord}
				isLoading={isSearching}
			/>

			{/* Selected Record Detail Panel (with relationship explorer) */}
			{selectedRecord && (
				<RecordDetail
					record={selectedRecord}
					allRecords={records}
					onClose={() => setSelectedRecord(null)}
					onDelete={handleDelete}
					onNavigate={setSelectedRecord}
					onUpdate={handleUpdateRecord}
					courses={coursesList}
					teachers={teachersList}
				/>
			)}

			{/* Status / Error bar */}
			{(error || records.length === 0) && (
				<div
					className="liquid-glass"
					style={{
						position: "absolute",
						bottom: 12,
						left: "50%",
						transform: "translateX(-50%)",
						padding: "10px 24px",
						color: error?.startsWith("✅") ? "#6ee7b7" : "#f87171",
						fontSize: "0.85rem",
						fontFamily: "ui-sans-serif, system-ui, sans-serif",
						zIndex: 70,
						pointerEvents: "auto",
						display: "flex",
						alignItems: "center",
						gap: 16,
					}}
				>
					<span>
						{error ||
							"No records found. Run `node scripts/seed.js` to populate the universe."}
					</span>
				</div>
			)}

			<style>{`
				@keyframes spin { to { transform: rotate(360deg); } }
			`}</style>

			{/* Record count */}
			{records.length > 0 && (
				<div
					style={{
						position: "absolute",
						bottom: 20,
						left: 20,
						color: "#3f3f46",
						fontSize: "0.7rem",
						fontFamily: "ui-sans-serif, system-ui, sans-serif",
						zIndex: 50,
					}}
				>
					{records.length} stars in the universe
				</div>
			)}
		</div>
	);
}
