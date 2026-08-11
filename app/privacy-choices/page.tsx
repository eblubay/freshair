import type { Metadata } from "next"
import { PrivacyRequestForm } from "@/app/privacy-choices/PrivacyRequestForm"
import { LegalPage, LegalSection } from "@/app/_components/LegalPage"
export const metadata: Metadata = { title: "Privacy Choices / Do Not Sell or Share" }
export default function PrivacyChoicesPage() { return <LegalPage title="Privacy Choices" intro="Submit an access, correction, deletion, privacy-question, or do-not-sell/share request for manual review."><LegalSection title="Do Not Sell or Share My Personal Information"><p>Shell By The Shore does not sell or share personal information for cross-context behavioral advertising in the current application. You may still submit an opt-out request or another privacy request below.</p><PrivacyRequestForm/></LegalSection></LegalPage> }
