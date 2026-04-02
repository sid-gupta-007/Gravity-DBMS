import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import SupernovaEffect from "./SupernovaEffect";

// Entity-type based stellar colors (scientifically inspired)
const ENTITY_COLORS = {
	Course: new THREE.Color("#9db4ff").multiplyScalar(10.0),   // O-Class Blue Giant
	Subject: new THREE.Color("#baccff").multiplyScalar(10.5),  // A-Class White-Blue
	Teacher: new THREE.Color("#fff5ec").multiplyScalar(10.5),  // G-Class Yellow (Sun)
	Student: new THREE.Color("#ffbe7f").multiplyScalar(10.0),  // M-Class Red Dwarf
	General: new THREE.Color("#6ee7b7").multiplyScalar(10.0),  // Emerald (custom entities)
};

const ENTITY_SIZES = {
	Course: 2.5,
	Teacher: 1.8,
	Subject: 1.4,
	Student: 1.0,
};

// Distinct hues for department labels (generated dynamically)
const DEPT_LABEL_COLORS = [
	"#9db4ff", "#ffbe7f", "#c084fc", "#6ee7b7",
	"#f9a8d4", "#fbbf24", "#38bdf8", "#a78bfa",
];

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

// ==========================================
// DYNAMIC NODE CONNECTIONS (FOREIGN KEYS)
// ==========================================
function RelationLines({ nodes, highlightedIds, hoveredId }) {
	const lineRef = useRef();

	const { positions, colors, count, activePairs } = useMemo(() => {
		if (!nodes || nodes.length < 2)
			return { positions: new Float32Array(0), colors: new Float32Array(0), count: 0, activePairs: [] };

		const pairs = [];
		const activeNodes = nodes.filter(
			(n) => highlightedIds.has(n.id) || n.id === hoveredId
		);

		activeNodes.forEach((activeNode) => {
			const meta = activeNode.metadata || {};

			if (meta.course_id) {
				const courseNode = nodes.find((n) => n.id === meta.course_id);
				if (courseNode) pairs.push({ a: activeNode, b: courseNode });
			}

			if (meta.teacher_id) {
				const teacherNode = nodes.find((n) => n.id === meta.teacher_id);
				if (teacherNode) pairs.push({ a: activeNode, b: teacherNode });
			}

			if (activeNode.entity_type === "Course") {
				nodes.forEach((n) => {
					if (n.metadata?.course_id === activeNode.id)
						pairs.push({ a: activeNode, b: n });
				});
			}

			if (activeNode.entity_type === "Teacher") {
				nodes.forEach((n) => {
					if (n.metadata?.teacher_id === activeNode.id)
						pairs.push({ a: activeNode, b: n });
				});
			}
		});

		const pos = new Float32Array(pairs.length * 6);
		const col = new Float32Array(pairs.length * 6);

		pairs.forEach((pair, idx) => {
			const colorA =
				ENTITY_COLORS[pair.a.entity_type] || ENTITY_COLORS.General;
			const colorB =
				ENTITY_COLORS[pair.b.entity_type] || ENTITY_COLORS.General;

			col[idx * 6] = colorA.r * 0.8;
			col[idx * 6 + 1] = colorA.g * 0.8;
			col[idx * 6 + 2] = colorA.b * 0.8;
			col[idx * 6 + 3] = colorB.r * 0.8;
			col[idx * 6 + 4] = colorB.g * 0.8;
			col[idx * 6 + 5] = colorB.b * 0.8;
		});

		return { positions: pos, colors: col, count: pairs.length, activePairs: pairs };
	}, [nodes, highlightedIds, hoveredId]);

	useFrame(() => {
		if (!lineRef.current || count === 0) return;
		const posAttr = lineRef.current.geometry.getAttribute("position");
		const arr = posAttr.array;

		activePairs.forEach((pair, i) => {
			arr[i * 6] = pair.a.x;
			arr[i * 6 + 1] = pair.a.y;
			arr[i * 6 + 2] = pair.a.z;
			arr[i * 6 + 3] = pair.b.x;
			arr[i * 6 + 4] = pair.b.y;
			arr[i * 6 + 5] = pair.b.z;
		});
		posAttr.needsUpdate = true;
	});

	if (count === 0) return null;

	return (
		<lineSegments key={`lines-${count}`} ref={lineRef}>
			<bufferGeometry>
				<bufferAttribute
					attach="attributes-position"
					count={count * 2}
					array={positions}
					itemSize={3}
				/>
				<bufferAttribute
					attach="attributes-color"
					count={count * 2}
					array={colors}
					itemSize={3}
				/>
			</bufferGeometry>
			<lineBasicMaterial
				vertexColors
				transparent
				opacity={0.15}
				blending={THREE.AdditiveBlending}
			/>
		</lineSegments>
	);
}

function DashTooltip({ node, position }) {
	if (!node) return null;

	const { title, entity_type, department, metadata } = node;

	const renderMeta = () => {
		if (!metadata) return null;
		const entries = Object.entries(metadata).filter(
			([k, v]) => !["id", "name", "department", "entity_type", "course_id", "teacher_id"].includes(k) && v
		).slice(0, 3);
		if (entries.length === 0) return null;

		return (
			<div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
				{entries.map(([k, v]) => (
					<div key={k} style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "0.65rem", color: "#a1a1aa" }}>
						<span style={{ textTransform: "capitalize" }}>{k.replace(/_/g, " ")}:</span>
						<span style={{ color: "#e4e4e7", fontWeight: 600, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100px" }}>{v}</span>
					</div>
				))}
			</div>
		);
	};

	const iconMap = {
		Course: "🎓",
		Teacher: "👨‍🏫",
		Subject: "📚",
		Student: "🧑‍🎓",
		General: "✨"
	};

	const UI_COLORS = {
		Course: "#9db4ff",
		Subject: "#baccff",
		Teacher: "#fff5ec",
		Student: "#ffbe7f",
		General: "#6ee7b7",
	};

	return (
		<Html
			position={position}
			center
			style={{ pointerEvents: "none", zIndex: 100 }}
			distanceFactor={60}
		>
			<div
				className="liquid-glass"
				style={{
					background: "rgba(9, 9, 11, 0.75)",
					backdropFilter: "blur(16px)",
					border: "1px solid rgba(255, 255, 255, 0.15)",
					borderRadius: "12px",
					padding: "12px 16px",
					color: "#f4f4f5",
					minWidth: "180px",
					boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
					transform: "translateY(-60px)",
					transition: "all 0.2s ease",
					fontFamily: "ui-sans-serif, system-ui, sans-serif",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
					<span style={{ fontSize: "1.2rem" }}>{iconMap[entity_type] || iconMap.General}</span>
					<div style={{
						background: "rgba(255,255,255,0.05)",
						padding: "2px 6px",
						borderRadius: "4px",
						fontSize: "0.6rem",
						fontWeight: "700",
						letterSpacing: "0.05em",
						textTransform: "uppercase",
						color: UI_COLORS[entity_type] || UI_COLORS.General,
						border: `1px solid ${UI_COLORS[entity_type] || UI_COLORS.General}40`
					}}>
						{entity_type}
					</div>
				</div>
				
				<div style={{ 
					fontSize: "1.0rem", 
					fontWeight: 800, 
					whiteSpace: "nowrap",
					overflow: "hidden",
					textOverflow: "ellipsis",
					maxWidth: "220px",
					letterSpacing: "-0.02em"
				}}>
					{title || "Unknown Entity"}
				</div>
				
				{department && department !== "General" && (
					<div style={{ fontSize: "0.7rem", color: "#a1a1aa", marginTop: "2px" }}>
						Dept: <span style={{ color: "#d4d4d8" }}>{department}</span>
					</div>
				)}

				{(renderMeta()) && (
					<>
						<div style={{ height: "1px", background: "rgba(255,255,255,0.1)", margin: "8px 0" }} />
						{renderMeta()}
					</>
				)}
				
				<div style={{ marginTop: "10px", fontSize: "0.65rem", color: "#6ee7b7", textAlign: "center", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
					<div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#6ee7b7", animation: "pulse 2s infinite" }} />
					CLICK TO EXPLORE
				</div>
			</div>
		</Html>
	);
}

export default function Universe({
	records,
	searchResults,
	highlightedId,
	deletingId,
	onDeleteComplete,
	onStarClick,
	selectedRecordId,
	hideLabels,
}) {
	const meshRef = useRef();
	const groupRef = useRef();
	const { raycaster, camera, pointer } = useThree();

	const [hoveredIndex, setHoveredIndex] = useState(null);
	const [supernovas, setSupernovas] = useState([]);

	// ==========================================
	// DEPARTMENT-BASED CLUSTERING
	// ==========================================
	const departmentCenters = useMemo(() => {
		if (!records || records.length === 0) return {};

		// Extract unique departments
		const depts = new Set();
		records.forEach((r) => {
			const dept = r.metadata?.department || "General";
			depts.add(dept);
		});

		const deptArray = Array.from(depts).sort();
		const centers = {};
		const clusterRadius = 80; // Distance between department clusters

		deptArray.forEach((dept, i) => {
			const angle = (i / deptArray.length) * Math.PI * 2;
			centers[dept] = {
				position: new THREE.Vector3(
					Math.cos(angle) * clusterRadius,
					Math.sin(angle) * clusterRadius * 0.4,
					Math.sin(angle) * clusterRadius * 0.6
				),
				color: DEPT_LABEL_COLORS[i % DEPT_LABEL_COLORS.length],
				index: i,
			};
		});

		return centers;
	}, [records]);

	const nodes = useMemo(() => {
		if (!records || records.length === 0) return [];

		return records.map((rec, i) => {
			const type = rec.entity_type || "General";
			const dept = rec.metadata?.department || "General";
			const deptInfo = departmentCenters[dept] || {
				position: new THREE.Vector3(0, 0, 0),
			};
			const center = deptInfo.position;

			// Entity type determines orbit radius range
			const maxRadius =
				type === "Course"
					? 10
					: type === "Teacher"
						? 20
						: type === "Subject"
							? 30
							: 45;
			const radius = 5 + Math.random() * maxRadius;
			const theta = Math.random() * 2 * Math.PI;
			const phi = Math.acos(Math.random() * 2 - 1);
			const orbitSpeed =
				(Math.random() * 0.5 + 0.1) * (Math.random() > 0.5 ? 1 : -1);

			return {
				id: rec.id,
				index: i,
				entity_type: type,
				department: dept,
				title: rec.title,
				metadata: rec.metadata,
				color: (ENTITY_COLORS[type] || ENTITY_COLORS.General).clone(),
				baseColor: (ENTITY_COLORS[type] || ENTITY_COLORS.General).clone(),
				center: center,
				radius,
				theta,
				phi,
				orbitSpeed,
				x: center.x,
				y: center.y,
				z: center.z,
			};
		});
	}, [records, departmentCenters]);

	const highlightedIds = useMemo(() => {
		if (!searchResults || searchResults.length === 0) return new Set();
		return new Set(searchResults.map((r) => r.id));
	}, [searchResults]);

	// Animate orbits
	useFrame((state) => {
		if (!meshRef.current || nodes.length === 0) return;
		const time = state.clock.getElapsedTime();

		nodes.forEach((node, i) => {
			const currentTheta = node.theta + time * node.orbitSpeed * 0.2;
			const isSelected = node.id === selectedRecordId;
			const isHighlighted =
				highlightedIds.has(node.id) || node.id === highlightedId;
			const baseScale = ENTITY_SIZES[node.entity_type] || 0.8;
			const scale = isSelected
				? baseScale * 2.5
				: isHighlighted
					? baseScale * 2.0
					: baseScale * ((node.radius / 60) * 0.5 + 0.6);

			node.x =
				node.center.x +
				node.radius * Math.sin(node.phi) * Math.cos(currentTheta);
			node.y =
				node.center.y +
				node.radius * Math.sin(node.phi) * Math.sin(currentTheta);
			node.z =
				node.center.z + node.radius * Math.cos(node.phi);

			tempObject.position.set(node.x, node.y, node.z);
			tempObject.scale.set(scale, scale, scale);
			tempObject.updateMatrix();
			meshRef.current.setMatrixAt(i, tempObject.matrix);

			// Colors: hover → selected → highlight → dim → default
			const isHovered = i === hoveredIndex;

			if (isHovered) {
				tempColor.setHex(0xffffff);
			} else if (isSelected) {
				// Bright pulsing glow for selected star
				const pulse = Math.sin(time * 3) * 0.15 + 1.0;
				tempColor
					.copy(node.baseColor)
					.lerp(new THREE.Color(0xffffff), 0.5)
					.multiplyScalar(1.8 * pulse);
			} else if (isHighlighted) {
				tempColor
					.copy(node.baseColor)
					.lerp(new THREE.Color(0xffffff), 0.3)
					.multiplyScalar(1.5);
			} else if (highlightedIds.size > 0) {
				// Base colors are highly scaled (e.g. 10.0), so we need a very low multiplier 
				// to pull them below the bloom luminance threshold
				tempColor.copy(node.baseColor).multiplyScalar(0.01);
			} else {
				tempColor.copy(node.baseColor);
			}

			meshRef.current.setColorAt(i, tempColor);
		});

		meshRef.current.instanceMatrix.needsUpdate = true;
		if (meshRef.current.instanceColor)
			meshRef.current.instanceColor.needsUpdate = true;

		// Camera tracking for selected record
		if (selectedRecordId && state.controls) {
			state.controls.enabled = false;
			const targetNode = nodes.find((n) => n.id === selectedRecordId);
			if (targetNode) {
				const targetPos = new THREE.Vector3(
					targetNode.x,
					targetNode.y,
					targetNode.z
				);
				const camPos = targetPos
					.clone()
					.add(new THREE.Vector3(10, 5, 20));
				state.camera.position.lerp(camPos, 0.05);
				const targetRotation = new THREE.Quaternion().setFromRotationMatrix(
					new THREE.Matrix4().lookAt(
						state.camera.position,
						targetPos,
						state.camera.up
					)
				);
				state.camera.quaternion.slerp(targetRotation, 0.05);
			}
		} else if (state.controls && !state.controls.enabled) {
			state.controls.enabled = true;
			const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
				state.camera.quaternion
			);
			state.controls.target.copy(
				state.camera.position
					.clone()
					.add(forward.multiplyScalar(25))
			);
		}
	});

	// Deletion SuperNova Logic
	useEffect(() => {
		if (deletingId && nodes) {
			const targetNode = nodes.find((n) => n.id === deletingId);
			if (targetNode) {
				setSupernovas((prev) => [
					...prev,
					{
						id: deletingId,
						pos: [targetNode.x, targetNode.y, targetNode.z],
						color: targetNode.color,
					},
				]);
			}
		}
	}, [deletingId, nodes]);

	// Raycasting interactions
	const handleClick = useCallback(
		(e) => {
			e.stopPropagation();
			if (e.instanceId !== undefined && nodes[e.instanceId]) {
				onStarClick?.(nodes[e.instanceId]);
			}
		},
		[nodes, onStarClick]
	);

	const handlePointerMove = useCallback((e) => {
		if (e.instanceId !== undefined) {
			document.body.style.cursor = "pointer";
			setHoveredIndex(e.instanceId);
		}
	}, []);

	const handlePointerOut = useCallback(() => {
		document.body.style.cursor = "default";
		setHoveredIndex(null);
	}, []);

	const hoveredNode = hoveredIndex !== null ? nodes[hoveredIndex] : null;
	const showLabels = !hideLabels;

	return (
		<group ref={groupRef}>
			{/* Department Cluster Labels (the central "suns") */}
			{showLabels &&
				Object.entries(departmentCenters).map(([dept, info], i) => (
					<mesh key={dept} position={info.position}>
						<sphereGeometry args={[3, 32, 32]} />
						<meshBasicMaterial
							color={info.color}
							transparent
							opacity={0.6}
						/>
						<Html
							position={[0, 7, 0]}
							center
							transform
							distanceFactor={40}
							style={{
								pointerEvents: "none",
								color: "#fff",
								fontSize: "0.9rem",
								fontWeight: "800",
								fontFamily: '"Orbitron", sans-serif',
								textTransform: "uppercase",
								letterSpacing: "0.15em",
								whiteSpace: "nowrap",
								background: "rgba(0, 0, 0, 0.4)",
								padding: "6px 16px",
								borderRadius: "10px",
								border: `1px solid ${info.color}33`,
								backdropFilter: "blur(8px)",
								boxShadow: "0 8px 32px rgba(0, 0, 0, 0.8)",
								textAlign: "center",
								zIndex: 1,
							}}
						>
							{dept}
						</Html>
					</mesh>
				))}

			<instancedMesh
				key={`stars-${nodes.length}`}
				ref={meshRef}
				args={[null, null, nodes.length]}
				onClick={handleClick}
				onPointerMove={handlePointerMove}
				onPointerOut={handlePointerOut}
			>
				<sphereGeometry args={[0.3, 8, 8]} />
				<meshBasicMaterial toneMapped={false} />
			</instancedMesh>

			<RelationLines
				key={`gravity-lines-${nodes.length}`}
				nodes={nodes}
				highlightedIds={highlightedIds}
				hoveredId={hoveredNode?.id}
			/>

			{hoveredNode && (
				<DashTooltip
					node={hoveredNode}
					position={[hoveredNode.x, hoveredNode.y + 1, hoveredNode.z]}
				/>
			)}

			{supernovas.map((sn) => (
				<SupernovaEffect
					key={sn.id}
					position={sn.pos}
					color={sn.color}
					onComplete={() => {
						setSupernovas((prev) =>
							prev.filter((s) => s.id !== sn.id)
						);
						onDeleteComplete?.(sn.id);
					}}
				/>
			))}
		</group>
	);
}
