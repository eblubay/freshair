import { Toaster } from "@/components/ui/toaster"
import { ClerkProvider } from "@clerk/nextjs"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<ClerkProvider>
			{children}
			<Toaster />
		</ClerkProvider>
	)
}
