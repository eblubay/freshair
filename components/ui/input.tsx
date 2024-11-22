import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, type, value, onChange, ...props }, ref) => {
		// Special handling for number inputs
		const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			if (type === "number") {
				// Allow empty string for number inputs
				const newValue = e.target.value === "" ? "" : e.target.value
				onChange?.({
					...e,
					target: { ...e.target, value: newValue }
				} as React.ChangeEvent<HTMLInputElement>)
				return
			}
			onChange?.(e)
		}

		return (
			<input
				type={type}
				value={value}
				onChange={handleNumberChange}
				className={cn(
					"flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
					className
				)}
				ref={ref}
				{...props}
			/>
		)
	}
)
Input.displayName = "Input"

export { Input }
