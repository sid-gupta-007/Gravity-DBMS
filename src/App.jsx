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
	const [isSeeding, setIsSeeding] = useState(false);
	const [seedingProgress, setSeedingProgress] = useState({ current: 0, total: 0 });
	const [isAdding, setIsAdding] = useState(false);

	// Fetch all records on mount
	useEffect(() => {
		fetchRecords();
	}, []);

	const fetchRecords = async () => {
		const { data, error: err } = await supabase
			.from("documents")
			.select("id, title, content, category, metadata, created_at")
			.order("created_at", { ascending: true });

		if (err) {
			console.error("Failed to fetch records:", err);
			setError("Failed to connect to database. Have you run the schema.sql?");
			return;
		}
		setRecords(data || []);
	};

	// Semantic search
	const handleSearch = useCallback(async (query) => {
		setIsSearching(true);
		setError(null);
		try {
			// Generate embedding for the query
			const embedding = await generateEmbedding(query);

			// Call the match_documents RPC function
			const { data, error: err } = await supabase.rpc("match_documents", {
				query_embedding: embedding,
				match_count: 10,
				match_threshold: 0.1,
			});

			if (err) throw err;
			setSearchResults(data || []);
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
			const { error: err } = await supabase
				.from("documents")
				.delete()
				.eq("id", id);

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
		[]
	);

	// Add new record
	const handleAddRecord = useCallback(async ({ title, content, category, metadata }) => {
		setIsAdding(true);
		setError(null);
		try {
			// Generate embedding
			const text = `${title}. ${content}. Category: ${category}`;
			const embedding = await generateEmbedding(text);

			// Insert into Supabase
			const { data, error: insertErr } = await supabase
				.from("documents")
				.insert([{ title, content, category, metadata, embedding }])
				.select();

			if (insertErr) throw insertErr;
			if (data && data.length > 0) {
				setRecords((prev) => [...prev, data[0]]);
			}
		} catch (err) {
			console.error("Add record failed:", err);
			setError("Failed to add record. Check console.");
		} finally {
			setIsAdding(false);
		}
	}, []);

	// Seed embeddings for records that don't have them
	const handleSeedEmbeddings = useCallback(async () => {
		setIsSeeding(true);
		setError(null);
		try {
			// Get records without embeddings
			const { data: docs, error: fetchErr } = await supabase
				.from("documents")
				.select("id, title, content, category")
				.is("embedding", null);

			if (fetchErr) throw fetchErr;
			if (!docs || docs.length === 0) {
				setError("All records already have embeddings!");
				setIsSeeding(false);
				return;
			}

			setSeedingProgress({ current: 0, total: docs.length });

			for (let i = 0; i < docs.length; i++) {
				const doc = docs[i];
				setSeedingProgress({ current: i + 1, total: docs.length });

				const text = `${doc.title}. ${doc.content}. Category: ${doc.category}`;
				const embedding = await generateEmbedding(text);

				const { error: updateErr } = await supabase
					.from("documents")
					.update({ embedding })
					.eq("id", doc.id);

				if (updateErr) {
					console.error(`Failed to embed doc ${doc.id}:`, updateErr);
				}
			}

			setError(`✅ Embedded ${docs.length} records successfully!`);
			setSeedingProgress({ current: 0, total: 0 });
			await fetchRecords();
		} catch (err) {
			console.error("Seeding failed:", err);
			setError("Seeding failed. Ensure you ran the latest schema.sql (384-dim).");
		} finally {
			setIsSeeding(false);
		}
	}, []);

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
			<AddRecord onAdd={handleAddRecord} isAdding={isAdding} />

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
					style={{
						position: "absolute",
						left: 24,
						top: 24,
						width: 340,
						maxHeight: "calc(100vh - 148px)",
						background: "rgba(9,9,11,0.8)",
						backdropFilter: "blur(20px)",
						WebkitBackdropFilter: "blur(20px)",
						border: "1px solid rgba(255,255,255,0.1)",
						borderRadius: 16,
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
			{(error || records.length === 0 || isSeeding) && (
				<div
					style={{
						position: "absolute",
						bottom: 12,
						left: "50%",
						transform: "translateX(-50%)",
						background: "rgba(9,9,11,0.85)",
						backdropFilter: "blur(12px)",
						border: "1px solid rgba(255,255,255,0.1)",
						borderRadius: 12,
						padding: "10px 24px",
						color: error?.startsWith("✅") ? "#6ee7b7" : isSeeding ? "#f4f4f5" : "#f87171",
						fontSize: "0.85rem",
						fontFamily: "ui-sans-serif, system-ui, sans-serif",
						zIndex: 70,
						pointerEvents: "auto",
						display: "flex",
						alignItems: "center",
						gap: 16,
						boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
					}}
				>
					{isSeeding ? (
						<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
							<div className="seeding-spinner" style={{
								width: 14, height: 14, border: "2px solid #ffffff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite"
							}} />
							<span>Embedding stars: {seedingProgress.current} / {seedingProgress.total}</span>
						</div>
					) : (
						<span>{error || "No records found. Seed the database first."}</span>
					)}
					
					{records.length > 0 && !error?.startsWith("✅") && !isSeeding && (
						<button
							onClick={handleSeedEmbeddings}
							style={{
								background: "#ffffff",
								color: "#09090b",
								border: "none",
								borderRadius: 8,
								padding: "6px 14px",
								fontSize: "0.75rem",
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							Generate Embeddings
						</button>
					)}
				</div>
			)}

			<style>{`
				@keyframes spin { to { transform: rotate(360deg); } }
			`}</style>

			{/* Seed Embeddings button (top-right, always visible if records exist without errors) */}
			{records.length > 0 && !searchResults && !error && (
				<button
					onClick={handleSeedEmbeddings}
					disabled={isSeeding}
					style={{
						position: "absolute",
						top: 20,
						right: 20,
						background: "rgba(9,9,11,0.6)",
						backdropFilter: "blur(12px)",
						border: "1px solid rgba(255,255,255,0.1)",
						borderRadius: 10,
						padding: "8px 16px",
						color: "#a1a1aa",
						fontSize: "0.75rem",
						fontFamily: "ui-sans-serif, system-ui, sans-serif",
						cursor: isSeeding ? "not-allowed" : "pointer",
						zIndex: 60,
						transition: "all 0.2s ease",
						opacity: isSeeding ? 0.5 : 1,
					}}
					onMouseEnter={(e) => {
						e.target.style.borderColor = "rgba(255,255,255,0.2)";
						e.target.style.color = "#f4f4f5";
					}}
					onMouseLeave={(e) => {
						e.target.style.borderColor = "rgba(255,255,255,0.1)";
						e.target.style.color = "#a1a1aa";
					}}
				>
					{isSeeding ? "⏳ Generating Embeddings..." : "🌟 Seed Embeddings"}
				</button>
			)}

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
