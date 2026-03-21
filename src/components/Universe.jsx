import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
	forceSimulation,
	forceManyBody,
	forceX,
	forceY,
	forceZ,
} from "d3-force-3d";
import SupernovaEffect from "./SupernovaEffect";

const CATEGORY_COLORS = {
	Engineering: new THREE.Color(0xffffff).multiplyScalar(1.2),
	Marketing: new THREE.Color(0x818cf8).multiplyScalar(1.8),
	Design: new THREE.Color(0xc084fc).multiplyScalar(4),
	General: new THREE.Color(0x6ee7b7).multiplyScalar(2),
};

const DIM_MULTIPLIER = 0.15;
const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

function GravityLines({ nodes, highlightedIds }) {
	const lineRef = useRef();

	const { positions, colors, count } = useMemo(() => {
		if (!nodes || nodes.length < 2) return { positions: new Float32Array(0), colors: new Float32Array(0), count: 0 };

		const pairs = [];
		// Connect each node to its 2 nearest neighbors for visual gravity links
		for (let i = 0; i < nodes.length; i++) {
			const distances = [];
			for (let j = 0; j < nodes.length; j++) {
				if (i === j) continue;
				const dx = (nodes[i].x || 0) - (nodes[j].x || 0);
				const dy = (nodes[i].y || 0) - (nodes[j].y || 0);
				const dz = (nodes[i].z || 0) - (nodes[j].z || 0);
				distances.push({ j, dist: Math.sqrt(dx * dx + dy * dy + dz * dz) });
			}
			distances.sort((a, b) => a.dist - b.dist);
			for (let k = 0; k < Math.min(2, distances.length); k++) {
				const j = distances[k].j;
				if (i < j) {
					pairs.push([i, j, distances[k].dist]);
				}
			}
		}

		// Deduplicate
		const uniqueKey = new Set();
		const unique = pairs.filter(([a, b]) => {
			const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
			if (uniqueKey.has(key)) return false;
			uniqueKey.add(key);
			return true;
		});

		const pos = new Float32Array(unique.length * 6);
		const col = new Float32Array(unique.length * 6);

		unique.forEach(([a, b, dist], idx) => {
			const na = nodes[a];
			const nb = nodes[b];
			pos[idx * 6] = na.x || 0;
			pos[idx * 6 + 1] = na.y || 0;
			pos[idx * 6 + 2] = na.z || 0;
			pos[idx * 6 + 3] = nb.x || 0;
			pos[idx * 6 + 4] = nb.y || 0;
			pos[idx * 6 + 5] = nb.z || 0;

			const alpha = Math.max(0.05, 1 - dist / 80);
			const colorA = CATEGORY_COLORS[na.category] || CATEGORY_COLORS.General;
			const colorB = CATEGORY_COLORS[nb.category] || CATEGORY_COLORS.General;
			col[idx * 6] = colorA.r * alpha * 0.3;
			col[idx * 6 + 1] = colorA.g * alpha * 0.3;
			col[idx * 6 + 2] = colorA.b * alpha * 0.3;
			col[idx * 6 + 3] = colorB.r * alpha * 0.3;
			col[idx * 6 + 4] = colorB.g * alpha * 0.3;
			col[idx * 6 + 5] = colorB.b * alpha * 0.3;
		});

		return { positions: pos, colors: col, count: unique.length };
	}, [nodes]);

	// Update line positions every frame based on current node positions
	useFrame(() => {
		if (!lineRef.current || !nodes || nodes.length < 2) return;
		const posAttr = lineRef.current.geometry.getAttribute("position");
		if (!posAttr) return;
		const arr = posAttr.array;

		let idx = 0;
		const uniqueKey = new Set();
		for (let i = 0; i < nodes.length && idx < count; i++) {
			const distances = [];
			for (let j = 0; j < nodes.length; j++) {
				if (i === j) continue;
				const dx = (nodes[i].x || 0) - (nodes[j].x || 0);
				const dy = (nodes[i].y || 0) - (nodes[j].y || 0);
				const dz = (nodes[i].z || 0) - (nodes[j].z || 0);
				distances.push({ j, dist: Math.sqrt(dx * dx + dy * dy + dz * dz) });
			}
			distances.sort((a, b) => a.dist - b.dist);
			for (let k = 0; k < Math.min(2, distances.length); k++) {
				const j = distances[k].j;
				const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
				if (uniqueKey.has(key)) continue;
				if (i >= j) continue;
				uniqueKey.add(key);
				if (idx >= count) break;

				arr[idx * 6] = nodes[i].x || 0;
				arr[idx * 6 + 1] = nodes[i].y || 0;
				arr[idx * 6 + 2] = nodes[i].z || 0;
				arr[idx * 6 + 3] = nodes[j].x || 0;
				arr[idx * 6 + 4] = nodes[j].y || 0;
				arr[idx * 6 + 5] = nodes[j].z || 0;
				idx++;
			}
		}
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
			<lineBasicMaterial vertexColors transparent opacity={0.4} />
		</lineSegments>
	);
}

function Tooltip({ text, position }) {
	if (!text) return null;
	return (
		<Html position={position} center style={{ pointerEvents: "none" }}>
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

	// Build nodes from records
	const nodes = useMemo(() => {
		if (!records || records.length === 0) return [];
		return records.map((rec, i) => {
			const radius = 15 + Math.random() * 45;
			const theta = Math.random() * 2 * Math.PI;
			const phi = Math.acos(Math.random() * 2 - 1);
			return {
				id: rec.id,
				index: i,
				category: rec.category,
				title: rec.title,
				color: (CATEGORY_COLORS[rec.category] || CATEGORY_COLORS.General).clone(),
				x: radius * Math.sin(phi) * Math.cos(theta),
				y: radius * Math.sin(phi) * Math.sin(theta),
				z: radius * Math.cos(phi),
				ix: radius * Math.sin(phi) * Math.cos(theta),
				iy: radius * Math.sin(phi) * Math.sin(theta),
				iz: radius * Math.cos(phi),
			};
		});
	}, [records]);

	// Highlighted record IDs from search
	const highlightedIds = useMemo(() => {
		if (!searchResults || searchResults.length === 0) return new Set();
		return new Set(searchResults.map((r) => r.id));
	}, [searchResults]);

	// Build force simulation
	const simulation = useMemo(() => {
		if (nodes.length === 0) return null;
		const sim = forceSimulation()
			.numDimensions(3)
			.nodes(nodes)
			.force("charge", forceManyBody().strength(-1.5))
			.force("x", forceX((d) => d.ix).strength(0.03))
			.force("y", forceY((d) => d.iy).strength(0.03))
			.force("z", forceZ((d) => d.iz).strength(0.03))
			.alpha(0.3)
			.alphaDecay(0.01);
		return sim;
	}, [nodes]);

	// Apply search clustering forces
	useEffect(() => {
		if (!simulation || nodes.length === 0) return;

		if (searchResults && searchResults.length > 0) {
			// Pull matched stars toward center, push others outward
			simulation
				.force(
					"x",
					forceX((d) => {
						if (highlightedIds.has(d.id)) {
							const catIndex = ["Engineering", "Marketing", "Design"].indexOf(d.category);
							return catIndex === 0 ? -15 : catIndex === 1 ? 15 : 0;
						}
						return d.ix * 1.5;
					}).strength((d) => (highlightedIds.has(d.id) ? 0.15 : 0.02))
				)
				.force(
					"y",
					forceY((d) => {
						if (highlightedIds.has(d.id)) return 0;
						return d.iy * 1.5;
					}).strength((d) => (highlightedIds.has(d.id) ? 0.15 : 0.02))
				)
				.force(
					"z",
					forceZ((d) => {
						if (highlightedIds.has(d.id)) return 0;
						return d.iz * 1.5;
					}).strength((d) => (highlightedIds.has(d.id) ? 0.15 : 0.02))
				)
				.alpha(0.8)
				.restart();
		} else {
			simulation
				.force("x", forceX((d) => d.ix).strength(0.03))
				.force("y", forceY((d) => d.iy).strength(0.03))
				.force("z", forceZ((d) => d.iz).strength(0.03))
				.alpha(0.5)
				.restart();
		}
	}, [searchResults, simulation, highlightedIds, nodes]);

	// Trigger supernova on delete
	useEffect(() => {
		if (!deletingId || nodes.length === 0) return;
		const node = nodes.find((n) => n.id === deletingId);
		if (!node) return;

		setSupernovas((prev) => [
			...prev,
			{
				id: deletingId,
				position: [node.x || 0, node.y || 0, node.z || 0],
				color: node.color,
			},
		]);
	}, [deletingId, nodes]);

	// Handle supernova completion
	const handleSupernovaComplete = useCallback(
		(id) => {
			setSupernovas((prev) => prev.filter((s) => s.id !== id));
			onDeleteComplete?.(id);
		},
		[onDeleteComplete]
	);

	// Raycasting for hover
	useFrame(() => {
		if (!meshRef.current || nodes.length === 0) return;

		// Tick simulation
		if (simulation) simulation.tick();

		// Set up instanced mesh matrices and colors
		const hasHighlight = highlightedIds.size > 0;

		nodes.forEach((node, i) => {
			if (node.id === deletingId) {
				// Hide deleted star
				tempObject.position.set(99999, 99999, 99999);
				tempObject.scale.set(0, 0, 0);
			} else {
				const x = isNaN(node.x) ? 0 : node.x;
				const y = isNaN(node.y) ? 0 : node.y;
				const z = isNaN(node.z) ? 0 : node.z;
				tempObject.position.set(x, y, z);

				const isHighlighted = highlightedIds.has(node.id);
				const isHovered = hoveredIndex === i || highlightedId === node.id;
				const scale = isHovered ? 1.8 : isHighlighted ? 1.4 : 1;
				tempObject.scale.set(scale, scale, scale);
			}
			tempObject.updateMatrix();
			meshRef.current.setMatrixAt(i, tempObject.matrix);

			// Color: dim non-matches during search
			const isHighlighted = highlightedIds.has(node.id);
			const isHovered = hoveredIndex === i;
			if (hasHighlight && !isHighlighted) {
				tempColor.copy(node.color).multiplyScalar(DIM_MULTIPLIER);
			} else if (isHovered) {
				tempColor.copy(node.color).multiplyScalar(2.5);
			} else {
				tempColor.copy(node.color);
			}
			meshRef.current.setColorAt(i, tempColor);
		});

		meshRef.current.instanceMatrix.needsUpdate = true;
		if (meshRef.current.instanceColor)
			meshRef.current.instanceColor.needsUpdate = true;

		// Slow rotation
		if (groupRef.current) {
			groupRef.current.rotation.y += 0.0005;
		}

		// Raycasting for hover
		raycaster.setFromCamera(pointer, camera);
		const intersects = raycaster.intersectObject(meshRef.current);
		if (intersects.length > 0) {
			setHoveredIndex(intersects[0].instanceId);
		} else {
			setHoveredIndex(null);
		}
	});

	// Handle click
	const handleClick = useCallback(
		(e) => {
			if (e.instanceId !== undefined && nodes[e.instanceId]) {
				const record = records?.find((r) => r.id === nodes[e.instanceId].id);
				if (record) onStarClick?.(record);
			}
		},
		[nodes, records, onStarClick]
	);

	if (!nodes.length) return null;

	const hoveredNode = hoveredIndex !== null ? nodes[hoveredIndex] : null;

	return (
		<group ref={groupRef}>
			<instancedMesh
				key={`stars-${nodes.length}`}
				ref={meshRef}
				args={[null, null, nodes.length]}
				onClick={handleClick}
			>
				<sphereGeometry args={[0.35, 10, 10]} />
				<meshBasicMaterial toneMapped={false} />
			</instancedMesh>

			<GravityLines key={`gravity-lines-${nodes.length}`} nodes={nodes} highlightedIds={highlightedIds} />

			{hoveredNode && (
				<Tooltip
					text={hoveredNode.title}
					position={[
						hoveredNode.x || 0,
						hoveredNode.y || 0,
						hoveredNode.z || 0,
					]}
				/>
			)}

			{supernovas.map((sn) => (
				<SupernovaEffect
					key={sn.id}
					position={sn.position}
					color={sn.color}
					onComplete={() => handleSupernovaComplete(sn.id)}
				/>
			))}
		</group>
	);
}
