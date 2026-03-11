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

	const [nodes] = useState(() => {
		return Array.from({ length: STAR_COUNT }, (_, i) => {
			const cat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

			// Upgraded to true spherical Math so the dispersed galaxy is perfectly round
			const radius = 20 + Math.random() * 80;
			const theta = Math.random() * 2 * Math.PI;
			const phi = Math.acos(Math.random() * 2 - 1);

			const rx = radius * Math.sin(phi) * Math.cos(theta);
			const ry = radius * Math.sin(phi) * Math.sin(theta);
			const rz = radius * Math.cos(phi);

			return {
				id: i,
				category: cat.name,
				color: cat.color,
				x: rx,
				y: ry,
				z: rz,
				ix: rx,
				iy: ry,
				iz: rz,
			};
		});
	});

	// THE CRITICAL FIX: Set numDimensions to 3 BEFORE passing the nodes
	const [simulation] = useState(() => {
		return forceSimulation()
			.numDimensions(3)
			.nodes(nodes)
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

	useEffect(() => {
		if (triggerGravity) {
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
		meshRef.current.rotation.y += 0.001;
	});

	return (
		<instancedMesh ref={meshRef} args={[null, null, STAR_COUNT]}>
			<sphereGeometry args={[0.2, 8, 8]} />
			<meshBasicMaterial toneMapped={false} />
		</instancedMesh>
	);
}
