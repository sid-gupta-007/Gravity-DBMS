import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import SupernovaEffect from "./SupernovaEffect";

const CATEGORY_COLORS = {
	Course: new THREE.Color(0xfde047).multiplyScalar(3), // Yellow glowing core
	Teacher: new THREE.Color(0xfca5a5).multiplyScalar(2), // Red
	Subject: new THREE.Color(0xc084fc).multiplyScalar(2), // Purple
	Student: new THREE.Color(0x6ee7b7).multiplyScalar(2), // Green
	General: new THREE.Color(0xffffff),
};

// Fixed positions for the "Table" Super-Stars
const TABLE_CENTERS = {
	Course: new THREE.Vector3(0, 0, 0),
	Subject: new THREE.Vector3(-100, 50, -50),
	Teacher: new THREE.Vector3(100, 50, -50),
	Student: new THREE.Vector3(0, -120, 50),
};

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();



// ==========================================
// DYNAMIC NODE CONNECTIONS (FOREIGN KEYS)
// ==========================================
function RelationLines({ nodes, highlightedIds, hoveredId }) {
	const lineRef = useRef();

	const { positions, colors, count, activePairs } = useMemo(() => {
		if (!nodes || nodes.length < 2) return { positions: new Float32Array(0), colors: new Float32Array(0), count: 0, activePairs: [] };

		const pairs = [];
		// We only want to draw lines for highlighted/hovered nodes to save performance
		// and avoid a messy spiderweb of 2000 lines
		const activeNodes = nodes.filter(n => highlightedIds.has(n.id) || n.id === hoveredId);

		activeNodes.forEach(activeNode => {
			const meta = activeNode.metadata || {};

			// If it's a student, connect to their course
			if (meta.course_id) {
				const courseNode = nodes.find(n => n.id === meta.course_id);
				if (courseNode) pairs.push({ a: activeNode, b: courseNode });
			}

			// If it's a subject, connect to course and teacher
			if (meta.teacher_id) {
				const teacherNode = nodes.find(n => n.id === meta.teacher_id);
				if (teacherNode) pairs.push({ a: activeNode, b: teacherNode });
			}

			// If it's a course, connect all students and subjects enrolled/belonging to it
			if (activeNode.entity_type === "Course") {
				nodes.forEach(n => {
					if (n.metadata?.course_id === activeNode.id) pairs.push({ a: activeNode, b: n });
				});
			}

			// If teacher
			if (activeNode.entity_type === "Teacher") {
				nodes.forEach(n => {
					if (n.metadata?.teacher_id === activeNode.id) pairs.push({ a: activeNode, b: n });
				});
			}
		});

		const pos = new Float32Array(pairs.length * 6);
		const col = new Float32Array(pairs.length * 6);

		pairs.forEach((pair, idx) => {
			const colorA = CATEGORY_COLORS[pair.a.entity_type] || CATEGORY_COLORS.General;
			const colorB = CATEGORY_COLORS[pair.b.entity_type] || CATEGORY_COLORS.General;

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
				<bufferAttribute attach="attributes-position" count={count * 2} array={positions} itemSize={3} />
				<bufferAttribute attach="attributes-color" count={count * 2} array={colors} itemSize={3} />
			</bufferGeometry>
			<lineBasicMaterial vertexColors transparent opacity={0.6} blending={THREE.AdditiveBlending} />
		</lineSegments>
	);
}

function Tooltip({ text, position }) {
	if (!text) return null;
	return (
		<Html position={position} center style={{ pointerEvents: "none", zIndex: 100 }}>
			<div
				style={{
					background: "rgba(9,9,11,0.85)",
					backdropFilter: "blur(12px)",
					border: "1px solid rgba(255,255,255,0.12)",
					borderRadius: "8px",
					padding: "6px 12px",
					color: "#f4f4f5",
					fontSize: "0.75rem",
					fontFamily: "ui-sans-serif, system-ui, sans-serif",
					fontWeight: 500,
					whiteSpace: "nowrap",
					transform: "translateY(-28px)",
				}}
			>
				{text}
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
}) {
	const meshRef = useRef();
	const groupRef = useRef();
	const { raycaster, camera, pointer } = useThree();

	const [hoveredIndex, setHoveredIndex] = useState(null);
	const [supernovas, setSupernovas] = useState([]);

	const nodes = useMemo(() => {
		if (!records || records.length === 0) return [];
		return records.map((rec, i) => {
			const type = rec.entity_type || "General";
			const center = TABLE_CENTERS[type] || new THREE.Vector3(0, 0, 0);

			// Gravity weight defines orbit radius and speed
			// E.g. Courses have huge variance, Students are tightly bound
			const maxRadius = type === "Student" ? 60 : 80;
			const radius = 10 + Math.random() * maxRadius;
			const theta = Math.random() * 2 * Math.PI;
			const phi = Math.acos(Math.random() * 2 - 1);
			const orbitSpeed = (Math.random() * 0.5 + 0.1) * (Math.random() > 0.5 ? 1 : -1);

			// If it's the exact searched one, maybe pull it closer, but we'll do orbit math in useFrame
			return {
				id: rec.id,
				index: i,
				entity_type: type,
				title: rec.title,
				metadata: rec.metadata,
				color: (CATEGORY_COLORS[type] || CATEGORY_COLORS.General).clone(),
				baseColor: (CATEGORY_COLORS[type] || CATEGORY_COLORS.General).clone(),
				// Orbit parameters
				center: center,
				radius,
				theta,
				phi,
				orbitSpeed,
				// Current exact WebGL position (updated in frame)
				x: center.x,
				y: center.y,
				z: center.z,
			};
		});
	}, [records]);

	const highlightedIds = useMemo(() => {
		if (!searchResults || searchResults.length === 0) return new Set();
		return new Set(searchResults.map((r) => r.id));
	}, [searchResults]);

	// Animate orbits without physics simulation (60fps guaranteed for 2000 points)
	useFrame(({ clock }) => {
		if (!meshRef.current || nodes.length === 0) return;
		const time = clock.getElapsedTime();

		nodes.forEach((node, i) => {
			// Compute orbit
			const currentTheta = node.theta + time * node.orbitSpeed * 0.2;

			// Highlight pulling - if searched, pull to front slightly or pulse
			const isHighlighted = highlightedIds.has(node.id) || node.id === highlightedId;
			const scale = isHighlighted ? 1.5 : (node.radius / 80) * 0.8 + 0.5;

			node.x = node.center.x + node.radius * Math.sin(node.phi) * Math.cos(currentTheta);
			node.y = node.center.y + node.radius * Math.sin(node.phi) * Math.sin(currentTheta);
			node.z = node.center.z + node.radius * Math.cos(node.phi);

			// Apply to instance
			tempObject.position.set(node.x, node.y, node.z);
			tempObject.scale.set(scale, scale, scale);
			tempObject.updateMatrix();
			meshRef.current.setMatrixAt(i, tempObject.matrix);

			// Hover/Highlight colors
			const isHovered = i === hoveredIndex;

			if (isHovered) {
				tempColor.setHex(0xffffff); // White hover
			} else if (isHighlighted) {
				tempColor.copy(node.baseColor).lerp(new THREE.Color(0xffffff), 0.3).multiplyScalar(1.5); // Brighten
			} else if (highlightedIds.size > 0) {
				tempColor.copy(node.baseColor).multiplyScalar(0.2); // Dim non-matches
			} else {
				tempColor.copy(node.baseColor); // Default
			}

			meshRef.current.setColorAt(i, tempColor);
		});

		meshRef.current.instanceMatrix.needsUpdate = true;
		if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
	});

	// Deletion SuperNova Logic
	useEffect(() => {
		if (deletingId && nodes) {
			const targetNode = nodes.find((n) => n.id === deletingId);
			if (targetNode) {
				setSupernovas((prev) => [
					...prev,
					{ id: deletingId, pos: [targetNode.x, targetNode.y, targetNode.z], color: targetNode.color },
				]);
			}
		}
	}, [deletingId, nodes]);

	// Raycasting interactions
	const handleClick = useCallback((e) => {
		e.stopPropagation();
		if (e.instanceId !== undefined && nodes[e.instanceId]) {
			onStarClick?.(nodes[e.instanceId]);
		}
	}, [nodes, onStarClick]);

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

	return (
		<group ref={groupRef}>

			{/* Giant Table Stars */}
			{Object.entries(TABLE_CENTERS).map(([type, pos], i) => (
				<mesh key={type} position={pos}>
					<sphereGeometry args={[4, 32, 32]} />
					<meshBasicMaterial color={CATEGORY_COLORS[type] || 0xffffff} />
					<Html position={[0, 6, 0]} center style={{ pointerEvents: 'none', color: '#fff', fontSize: '1rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(0,0,0,1)' }}>
						{type}s
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
				<Tooltip
					text={hoveredNode.title}
					position={[hoveredNode.x, hoveredNode.y + 1, hoveredNode.z]}
				/>
			)}

			{supernovas.map((sn) => (
				<SupernovaEffect
					key={sn.id}
					position={sn.pos}
					color={sn.color}
					onComplete={() => {
						setSupernovas((prev) => prev.filter((s) => s.id !== sn.id));
						onDeleteComplete?.(sn.id);
					}}
				/>
			))}
		</group>
	);
}
