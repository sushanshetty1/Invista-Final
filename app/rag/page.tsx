import InvistaChatbot from "../../components/InvistaChatbot";
import DashboardGuard from "@/components/DashboardGuard";

export const metadata = {
  title: "Invista AI Assistant",
  description: "AI-powered assistant for processes, live data, and navigation.",
};

export default function Page() {
  return (
    <DashboardGuard>
      <InvistaChatbot />
    </DashboardGuard>
  );
}
