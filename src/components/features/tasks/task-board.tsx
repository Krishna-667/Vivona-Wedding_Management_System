"use client";

import * as React from "react";
import { toast } from "sonner";
import { updateTaskStageAction } from "@/app/actions/employee";
import type { Task, TaskStage, TaskPhase } from "@/types/database";

interface TaskBoardProps {
  weddingId: string;
  weddingCode: string;
  weddingTitle: string;
  initialTasks: Task[];
  userRole: "admin" | "employee" | "client";
}

const PHASES: { key: TaskPhase | "all"; label: string }[] = [
  { key: "all", label: "All Phases" },
  { key: "pre_wedding", label: "Pre-Wedding" },
  { key: "mehendi", label: "Mehendi" },
  { key: "sangeet", label: "Sangeet" },
  { key: "wedding_day", label: "Wedding Day" },
  { key: "reception", label: "Reception" },
  { key: "post_wedding", label: "Post-Wedding" },
];

const COLUMNS: { stage: TaskStage; label: string; color: string }[] = [
  { stage: "to_plan", label: "To Plan", color: "border-charcoal/30 bg-charcoal/5" },
  { stage: "in_progress", label: "In Progress", color: "border-gold-400 bg-gold-50/50" },
  { stage: "blocked", label: "Blocked", color: "border-terracotta/40 bg-terracotta/5" },
  { stage: "done", label: "Done", color: "border-sage-300 bg-sage-50/50" },
];

export function TaskBoard({
  weddingId,
  weddingCode,
  weddingTitle,
  initialTasks,
  userRole,
}: TaskBoardProps) {
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks);
  const [selectedPhase, setSelectedPhase] = React.useState<TaskPhase | "all">("all");
  const [updatingTaskId, setUpdatingTaskId] = React.useState<string | null>(null);

  const filteredTasks = tasks.filter((t) =>
    selectedPhase === "all" ? true : t.phase === selectedPhase
  );

  const doneCount = tasks.filter((t) => t.stage === "done").length;
  const progressPct = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const handleStageChange = async (taskId: string, targetStage: TaskStage) => {
    setUpdatingTaskId(taskId);
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              stage: targetStage,
              completed_at: targetStage === "done" ? new Date().toISOString() : null,
            }
          : t
      )
    );

    const res = await updateTaskStageAction(taskId, targetStage);
    setUpdatingTaskId(null);

    if (!res.ok) {
      toast.error(res.error || "Failed to update task.");
      // Rollback
      setTasks(initialTasks);
    } else {
      toast.success(`Task moved to ${targetStage.replace("_", " ")}.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Progress */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-maroon bg-maroon/10 px-2.5 py-1 rounded">
                {weddingCode}
              </span>
              <span className="text-xs font-semibold uppercase text-gold-600">
                Operational Task Board
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-charcoal mt-1">
              {weddingTitle}
            </h1>
          </div>

          <div className="text-left sm:text-right">
            <span className="font-mono text-2xl font-bold text-maroon">{progressPct}%</span>
            <p className="text-xs text-charcoal/60">
              {doneCount} of {tasks.length} tasks completed
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-border/60 h-2 rounded-full overflow-hidden">
          <div
            className="bg-maroon h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Phase Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {PHASES.map((p) => (
            <button
              key={p.key}
              onClick={() => setSelectedPhase(p.key)}
              className={`px-3 py-1.5 rounded-full transition-all shrink-0 ${
                selectedPhase === p.key
                  ? "bg-maroon text-ivory font-semibold shadow-xs"
                  : "bg-ivory-200 text-charcoal/70 hover:bg-ivory-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.stage === col.stage);

          return (
            <div
              key={col.stage}
              className={`rounded-2xl border ${col.color} p-4 space-y-3 flex flex-col justify-start min-h-[500px]`}
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="font-serif text-sm font-semibold text-charcoal">
                  {col.label}
                </span>
                <span className="font-mono text-xs font-bold text-charcoal/60 bg-background px-2 py-0.5 rounded-full border border-border">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-border bg-card p-3.5 space-y-2 shadow-2xs hover:shadow-xs transition-shadow"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          task.priority === "critical"
                            ? "bg-maroon text-ivory"
                            : task.priority === "high"
                            ? "bg-terracotta text-ivory"
                            : task.priority === "medium"
                            ? "bg-gold-100 text-gold-800"
                            : "bg-sage-100 text-sage-800"
                        }`}
                      >
                        {task.priority}
                      </span>
                      <span className="text-[10px] text-charcoal/50 font-mono">
                        Due {task.due_date}
                      </span>
                    </div>

                    <h4 className="font-serif text-sm font-semibold text-charcoal leading-snug">
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-[11px] text-charcoal/70 leading-relaxed font-sans line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Quick Move Buttons for Touch / Mobile */}
                    {userRole !== "client" && (
                      <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1 text-[10px]">
                        {col.stage !== "to_plan" && (
                          <button
                            onClick={() => handleStageChange(task.id, "to_plan")}
                            disabled={updatingTaskId === task.id}
                            className="text-charcoal/60 hover:text-maroon underline"
                          >
                            ← To Plan
                          </button>
                        )}
                        {col.stage !== "in_progress" && (
                          <button
                            onClick={() => handleStageChange(task.id, "in_progress")}
                            disabled={updatingTaskId === task.id}
                            className="text-gold-700 hover:text-gold-800 font-semibold"
                          >
                            In Progress
                          </button>
                        )}
                        {col.stage !== "done" && (
                          <button
                            onClick={() => handleStageChange(task.id, "done")}
                            disabled={updatingTaskId === task.id}
                            className="text-sage-700 hover:text-sage-800 font-bold"
                          >
                            Done ✓
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
