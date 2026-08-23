import { ClerkProvider } from "@clerk/nextjs"

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
	return <ClerkProvider>{children}</ClerkProvider>
}
