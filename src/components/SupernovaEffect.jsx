import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PARTICLE_COUNT = 120;

export default function SupernovaEffect({ position, color, onComplete }) {
	const meshRef = useRef();
	const startTime = useRef(Date.now());
	const completed = useRef(false);

	const particles = useMemo(() => {
		return Array.from({ length: PARTICLE_COUNT }, () => {
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(Math.random() * 2 - 1);
			const speed = 0.3 + Math.random() * 0.7;
			return {
				dir: new THREE.Vector3(
					Math.sin(phi) * Math.cos(theta) * speed,
					Math.sin(phi) * Math.sin(theta) * speed,
					Math.cos(phi) * speed
				),
				size: 0.15 + Math.random() * 0.35,
			};
		});
	}, []);

	const tempObject = useMemo(() => new THREE.Object3D(), []);

	const baseColor = useMemo(() => {
		if (color instanceof THREE.Color) return color.clone();
		return new THREE.Color(color || 0xffffff);
	}, [color]);

	useFrame(() => {
		if (!meshRef.current || completed.current) return;

		const elapsed = (Date.now() - startTime.current) / 1000;
		const duration = 1.8;
		const progress = Math.min(elapsed / duration, 1);

		// Ease out curve
		const ease = 1 - Math.pow(1 - progress, 3);
		const opacity = 1 - progress;

		particles.forEach((p, i) => {
			const spread = ease * 8;
			tempObject.position.set(
				position[0] + p.dir.x * spread,
				position[1] + p.dir.y * spread,
				position[2] + p.dir.z * spread
			);
			const scale = p.size * opacity;
			tempObject.scale.set(scale, scale, scale);
			tempObject.updateMatrix();
			meshRef.current.setMatrixAt(i, tempObject.matrix);

			// Color shifts to white then fades
			const flashColor = baseColor
				.clone()
				.lerp(new THREE.Color(0xffffff), progress * 0.5)
				.multiplyScalar(3 * opacity);
			meshRef.current.setColorAt(i, flashColor);
		});

		meshRef.current.instanceMatrix.needsUpdate = true;
		if (meshRef.current.instanceColor)
			meshRef.current.instanceColor.needsUpdate = true;

		if (progress >= 1 && !completed.current) {
			completed.current = true;
			onComplete?.();
		}
	});

	return (
		<instancedMesh key={`supernova-${position.join("-")}`} ref={meshRef} args={[null, null, PARTICLE_COUNT]}>
			<sphereGeometry args={[0.3, 6, 6]} />
			<meshBasicMaterial toneMapped={false} transparent opacity={1} />
		</instancedMesh>
	);
}
