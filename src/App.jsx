import React, { useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import Universe from "./components/Universe";
import ChatInterface from "./components/ChatInterface";
import SearchResults from "./components/SearchResults";
import AddRecord from "./components/AddRecord";
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
		
		// Map 'category' so the rest of the UI doesn't break 
		// (SearchResults expects 'category')
		const formattedData = (data || []).map(d => ({
			...d,
			category: d.entity_type
		}));
		
		setRecords(formattedData);
	};

	// Semantic search
	const handleSearch = useCallback(async (query) => {
		setIsSearching(true);
		setError(null);
		try {
			// Generate embedding for the query
			const embedding = await generateEmbedding(query);

			// Call the match_entities RPC function
			const { data, error: err } = await supabase.rpc("match_entities", {
				query_embedding: embedding,
				match_count: 20,
				match_threshold: 0.1,
			});

			if (err) throw err;
			
			// Format results
			const formattedResults = (data || []).map(d => ({
				...d,
				category: d.entity_type
			}));
			
			setSearchResults(formattedResults);
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
			const record = records.find(r => r.id === id);
			if (!record) return;

			let table = "students"; // Default fallback
			if (record.entity_type === "Course") table = "courses";
			if (record.entity_type === "Teacher") table = "teachers";
			if (record.entity_type === "Subject") table = "subjects";
			
			// The primary key column names differ
			let pkCol = "roll_no";
			if (table === "courses") pkCol = "course_id";
			if (table === "teachers") pkCol = "teacher_id";
			if (table === "subjects") pkCol = "subject_id";

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
			}
			setDeletingId(null);
		},
		[records]
	);

	// Add new record
	const handleAddRecord = useCallback(async ({ title, content, category, metadata }) => {
		setIsAdding(true);
		setError(null);
		try {
			// Generate embedding
			const text = `${title}. ${content}. Category: ${category}`;
			const embedding = await generateEmbedding(text);

			let table = "students";
			let record = { name: title, embedding };
			
			if (category === "Course" || category === "Engineering") {
				table = "courses";
				record.course_id = `CRS-NEW-${Date.now()}`;
			} else if (category === "Teacher") {
				table = "teachers";
				record.teacher_id = `TCH-NEW-${Date.now()}`;
			} else if (category === "Design" || category === "Subject") {
				table = "subjects";
				record.subject_id = `SUB-NEW-${Date.now()}`;
				record.course_id = "CRS-1"; // Mock FK
				record.teacher_id = "TCH-1"; // Mock FK
			} else {
				table = "students";
				record.roll_no = `STD-NEW-${Date.now()}`;
				record.course_id = "CRS-1"; // Mock FK
			}

			// Insert into Supabase
			const { data, error: insertErr } = await supabase
				.from(table)
				.insert([record])
				.select();

			if (insertErr) throw insertErr;
			// Refresh to get the generic view
			await fetchRecords();
		} catch (err) {
			console.error("Add record failed:", err);
			setError("Failed to add record. Check console.");
		} finally {
			setIsAdding(false);
		}
	}, []);

	// Seeding is now handled by scripts/seed.js due to the 2000 node scale
	// and to prevent browser memory crashes with the local AI model.


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
			/>

			{/* Search Results panel */}
			<SearchResults
				results={searchResults}
				onDeleteRecord={handleDelete}
				onHoverResult={setHighlightedId}
				onSelectResult={setSelectedRecord}
				isLoading={isSearching}
			/>

			{/* Selected Record Detail */}
			{selectedRecord && (
				<div
					className="liquid-glass"
					style={{
						position: "absolute",
						left: 24,
						top: 24,
						width: 340,
						maxHeight: "calc(100vh - 148px)",
						padding: 24,
						color: "#f4f4f5",
						fontFamily: "ui-sans-serif, system-ui, sans-serif",
						overflowY: "auto",
						zIndex: 60,
						pointerEvents: "auto",
					}}
				>
					<button
						onClick={() => setSelectedRecord(null)}
						style={{
							position: "absolute",
							top: 12,
							right: 12,
							background: "transparent",
							border: "none",
							color: "#71717a",
							cursor: "pointer",
							fontSize: "1.2rem",
							padding: 4,
						}}
					>
						✕
					</button>
					<div
						style={{
							fontSize: "0.65rem",
							fontWeight: 600,
							textTransform: "uppercase",
							letterSpacing: "0.08em",
							color:
								selectedRecord.category === "Engineering"
									? "#ffffff"
									: selectedRecord.category === "Marketing"
										? "#818cf8"
										: selectedRecord.category === "Design"
											? "#c084fc"
											: "#6ee7b7",
							marginBottom: 8,
						}}
					>
						{selectedRecord.category}
					</div>
					<h2
						style={{
							margin: "0 0 12px 0",
							fontSize: "1.3rem",
							fontWeight: 600,
							lineHeight: 1.3,
						}}
					>
						{selectedRecord.title}
					</h2>
					<p
						style={{
							margin: "0 0 16px 0",
							fontSize: "0.85rem",
							lineHeight: 1.7,
							color: "#a1a1aa",
						}}
					>
						{selectedRecord.content}
					</p>
					{selectedRecord.metadata &&
						Object.keys(selectedRecord.metadata).length > 0 && (
							<div
								style={{
									background: "rgba(255,255,255,0.04)",
									borderRadius: 8,
									padding: 12,
								}}
							>
								<div
									style={{
										fontSize: "0.7rem",
										fontWeight: 600,
										textTransform: "uppercase",
										color: "#71717a",
										marginBottom: 8,
									}}
								>
									Metadata
								</div>
								{Object.entries(selectedRecord.metadata).map(([key, val]) => (
									<div
										key={key}
										style={{
											display: "flex",
											justifyContent: "space-between",
											fontSize: "0.78rem",
											padding: "4px 0",
											borderBottom: "1px solid rgba(255,255,255,0.04)",
										}}
									>
										<span style={{ color: "#71717a" }}>{key}</span>
										<span style={{ color: "#d4d4d8" }}>
											{Array.isArray(val) ? val.join(", ") : String(val)}
										</span>
									</div>
								))}
							</div>
						)}
				</div>
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
					<span>{error || "No records found. Run `node scripts/seed.js` to populate the universe with 2000 stars."}</span>
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
