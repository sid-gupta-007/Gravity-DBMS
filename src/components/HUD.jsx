import React from "react";
import styles from "./HUD.module.css";

export default function HUD({ gravityActive, setGravityActive }) {
	return (
		<div className={styles.hudWrapper}>
			<div className={styles.glassPanel}>
				<div className={styles.hudHeader}>
					<h1 className={styles.title}>
						GRAVITY<span className={styles.accent}>_</span>
					</h1>
					<div className={styles.status}>
						<div
							className={`${styles.dot} ${gravityActive ? styles.dotActive : styles.dotStandby}`}
						></div>
						<span>System {gravityActive ? "Active" : "Standby"}</span>
					</div>
				</div>

				<button
					onClick={() => setGravityActive(!gravityActive)}
					className={`${styles.cyberBtn} ${gravityActive ? styles.btnRed : styles.btnCyan}`}
				>
					{gravityActive ? "DISPERSE_GALAXY" : "INITIATE_GRAVITY"}
				</button>

				<div>
					<div className={styles.dataRow}>
						<span className={styles.label}>Total Nodes</span>
						<span className={styles.value}>1,500</span>
					</div>
					<div className={styles.dataRow}>
						<span className={styles.label}>Physics Engine</span>
						<span className={styles.value}>D3-Force 3D</span>
					</div>
				</div>
			</div>
		</div>
	);
}
