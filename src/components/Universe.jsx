import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
	forceSimulation,
	forceManyBody,
	forceX,
	forceY,
	forceZ,
} from "d3-force-3d";

const STAR_COUNT = 1500;

const CATEGORIES = [
	{ name: "Engineering", color: new THREE.Color(0x00f0ff) },
	{ name: "Marketing", color: new THREE.Color(0xffaa00) },
	{ name: "Design", color: new THREE.Color(0xff003c) },
];

const tempObject = new THREE.Object3D();

export default function Universe({ triggerGravity }) {
	const meshRef = useRef();

	// 1. Generate Data with saved Initial Coordinates (ix, iy, iz)
	const [nodes] = useState(() => {
		return Array.from({ length: STAR_COUNT }, (_, i) => {
			const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
			const rx = (Math.random() - 0.5) * 150;
			const ry = (Math.random() - 0.5) * 150;
			const rz = (Math.random() - 0.5) * 150;
			return {
				id: i,
				category: cat.name,
				color: cat.color,
				x: rx,
				y: ry,
				z: rz, // Current position
				ix: rx,
				iy: ry,
				iz: rz, // Saved origin position for dispersing
			};
		});
	});

	// 2. Physics Init (Slightly stronger repulsion for cloud-like clusters)
	const [simulation] = useState(() => {
		return forceSimulation(nodes)
			.numDimensions(3)
			.force("charge", forceManyBody().strength(-2))
			.stop();
	});

	useLayoutEffect(() => {
		if (!meshRef.current) return;
		nodes.forEach((node, i) => {
			tempObject.position.set(node.x, node.y, node.z);
			tempObject.updateMatrix();
			meshRef.current.setMatrixAt(i, tempObject.matrix);
			meshRef.current.setColorAt(i, node.color);
		});
		meshRef.current.instanceMatrix.needsUpdate = true;
		if (meshRef.current.instanceColor)
			meshRef.current.instanceColor.needsUpdate = true;
	}, [nodes]);

	// 3. THE 3D FIX: True 3D targets for Gravity, Origin targets for Dispersal
	useEffect(() => {
		if (triggerGravity) {
			// Group them into deep 3D space
			simulation
				.force(
					"x",
					forceX((d) =>
						d.category === "Engineering"
							? -40
							: d.category === "Marketing"
								? 40
								: 0,
					).strength(0.1),
				)
				.force(
					"y",
					forceY((d) => (d.category === "Design" ? 40 : -20)).strength(0.1),
				)
				.force(
					"z",
					forceZ((d) =>
						d.category === "Engineering"
							? 40
							: d.category === "Marketing"
								? -40
								: 0,
					).strength(0.1),
				)
				.alpha(1)
				.restart();
		} else {
			// Scatter them back to their chaotic origins
			simulation
				.force("x", forceX((d) => d.ix).strength(0.05))
				.force("y", forceY((d) => d.iy).strength(0.05))
				.force("z", forceZ((d) => d.iz).strength(0.05))
				.alpha(1)
				.restart();
		}
	}, [triggerGravity, simulation]);

	useFrame(() => {
		if (!meshRef.current) return;
		simulation.tick();
		nodes.forEach((node, i) => {
			const x = isNaN(node.x) ? 0 : node.x;
			const y = isNaN(node.y) ? 0 : node.y;
			const z = isNaN(node.z) ? 0 : node.z;
			tempObject.position.set(x, y, z);
			tempObject.updateMatrix();
			meshRef.current.setMatrixAt(i, tempObject.matrix);
		});
		meshRef.current.instanceMatrix.needsUpdate = true;
		meshRef.current.rotation.y += 0.001; // Slow majestic rotation
	});

	return (
		<instancedMesh ref={meshRef} args={[null, null, STAR_COUNT]}>
			<sphereGeometry args={[0.2, 8, 8]} />
			<meshBasicMaterial toneMapped={false} />
		</instancedMesh>
	);
}
