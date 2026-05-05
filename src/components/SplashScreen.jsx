import React, { useEffect, useState } from 'react';
import styles from './SplashScreen.module.css';
import { getEmbedder } from '../lib/embeddings';

export default function SplashScreen({ onReady }) {
	const [progress, setProgress] = useState(0);
	const [status, setStatus] = useState("INITIALIZING");
	const [isHidden, setIsHidden] = useState(false);

	useEffect(() => {
		let isMounted = true;
		let loadingFiles = {};

		async function init() {
			try {
				setStatus("LOADING NEURAL PATHWAYS");
				
				// Pre-load the embedding models
				await getEmbedder((info) => {
					if (!isMounted) return;
					
					if (info.status === 'progress') {
						loadingFiles[info.file] = info.progress;
						// Approximate overall progress across multiple files
						const values = Object.values(loadingFiles);
						const avg = values.reduce((a, b) => a + b, 0) / values.length;
						setProgress(Math.round(avg));
					} else if (info.status === 'ready') {
						setProgress(100);
					}
				});
				
				setStatus("BUILDING THE UNIVERSE");
				setProgress(100);
				
				// Artificial cinematic delay
				setTimeout(() => {
					if (!isMounted) return;
					setIsHidden(true);
					setTimeout(onReady, 2000); // 2s matches the CSS transition duration
				}, 1800);

			} catch (err) {
				console.error("Init failed:", err);
				setStatus("SYSTEM FAILURE");
			}
		}

		init();

		return () => {
			isMounted = false;
		};
	}, [onReady]);

	return (
		<div className={`${styles.splashContainer} ${isHidden ? styles.splashHidden : ''}`}>
			<div className={styles.content}>
				<div className={styles.title}>GRAVITY</div>
				
				<div className={styles.progressBarContainer}>
					<div className={styles.progressBar} style={{ width: `${progress}%` }} />
				</div>
				
				<div className={styles.statusText}>
					{status}
				</div>
			</div>
		</div>
	);
}
