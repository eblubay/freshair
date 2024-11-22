"use client"

import { motion } from "framer-motion"

export function AnimatedWave() {
	return (
		<motion.span
			initial={{ rotate: 0 }}
			animate={{ rotate: [0, -20, 20, -20, 20, 0] }}
			transition={{ duration: 0.5, delay: 0.5 }}
		>
			👋
		</motion.span>
	)
}
