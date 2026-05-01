"use client";

import AnalysisResult from "@/app/components/AnalysisResult";
import { AIAnalysisResult } from "@/lib/api";

type AnalysisResultPanelProps = {
  analysis: AIAnalysisResult;
  jobDescription: string;
};

export default function AnalysisResultPanel({ analysis, jobDescription }: AnalysisResultPanelProps) {
  return <AnalysisResult analysis={analysis} jobDescription={jobDescription} />;
}
