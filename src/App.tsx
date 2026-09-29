import { BriefScreen } from "@/screens/brief-screen";
import { MeetingScreen } from "@/screens/meeting-screen";
import { PracticeIntroScreen } from "@/screens/practice-intro-screen";
import { ShortReportScreen } from "@/screens/short-report-screen";
import { FullReportScreen } from "@/screens/full-report-screen";
import { ReplayScreen } from "@/screens/replay-screen";
import { LessonOutcomeScreen } from "@/screens/lesson-outcome-screen";
import "@/report.css";

export default function App() {
  const screen = new URLSearchParams(window.location.search).get("screen");

  if (screen === "meeting") return <MeetingScreen />;
  if (screen === "brief") return <BriefScreen />;
  if (screen === "report") return <ShortReportScreen />;
  if (screen === "full-report") return <FullReportScreen />;
  if (screen === "replay") return <ReplayScreen />;
  if (screen === "lesson-outcome") return <LessonOutcomeScreen />;
  return <PracticeIntroScreen />;
}
