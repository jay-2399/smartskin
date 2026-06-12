import { notFound } from "next/navigation";
import { QuestionScreen } from "@/components/screens/QuestionScreen";
import { STEP_ORDER } from "@/features/funnel/questions";
import type { StepId } from "@/features/funnel/types";

export default async function Page({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!(STEP_ORDER as readonly string[]).includes(step)) notFound();
  return <QuestionScreen step={step as StepId} />;
}
