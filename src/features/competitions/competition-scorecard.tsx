"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HACKATHON_TRACKS } from "./contracts";
import type { CompetitionAssignment, CompetitionCriterion, CompetitionScorecard, StaffCompetitionResponse } from "./staff-contract";
import { HACKATHON_FINAL_FAIRNESS, HACKATHON_SCREENING_FAIRNESS } from "./rubric-defaults";
import { staffCompetitionCopy } from "./staff-copy";

type Action = (action: string, payload: Record<string, unknown>) => Promise<StaffCompetitionResponse | void>;
function PrivateFile({ entryId, file, busy, act }: { entryId: string; file: { id: string; name: string }; busy: boolean; act: Action }) {
  const [url, setUrl] = useState<string | null>(null);
  return <li><bdi>{file.name}</bdi> <Button size="small" variant="secondary" disabled={busy} onClick={() => { setUrl(null); void act("file_read", { entryId, fileId: file.id }).then((response) => { if (response?.fileTransfer?.fileId === file.id) setUrl(response.fileTransfer.url); }); }}>Request private download</Button>{url ? <a href={url} target="_blank" rel="noreferrer" referrerPolicy="no-referrer">Open file — link expires in one minute</a> : null}</li>;
}
/** Guidance comes from the assignment's immutable rubric snapshot, including edits. */
export function CompetitionCriterionGuidance({ criterion }: { criterion: CompetitionCriterion }) {
  return <div className="competition-criterion-guidance">
    {criterion.rubricVersion ? <small>Rubric version: {criterion.rubricVersion}</small> : null}
    {criterion.questions?.length ? <ul>{criterion.questions.map((question, index) => <li key={index}>{question}</li>)}</ul> : null}
    {criterion.scale?.length ? <details open><summary>1–5 scoring anchors</summary><dl>{criterion.scale.map((point) => <div key={point.score}><dt>{point.score} {point.label}</dt><dd>{point.description}</dd></div>)}</dl></details> : null}
    {criterion.anchors?.length ? <dl aria-label="Criterion-specific anchors">{criterion.anchors.map((point) => <div key={point.score}><dt>{point.score}</dt><dd>{point.description}</dd></div>)}</dl> : null}
  </div>;
}
export function CompetitionScorecardPanel({ assignment, mode, busy, act, canScore }: { assignment: CompetitionAssignment; mode: "staff" | "reviewer" | "judge"; busy: boolean; act: Action; canScore: boolean }) {
  const copy = staffCompetitionCopy.en;
  const [scores, setScores] = useState<Record<string, string>>(() => Object.fromEntries(assignment.scorecard?.scores.map((row) => [row.criterionId, String(row.value)]) ?? []));
  const [comments, setComments] = useState(assignment.scorecard?.comments ?? ""), [reason, setReason] = useState(""), [concern, setConcern] = useState(""), [category, setCategory] = useState("originality");
  const card = (): CompetitionScorecard => ({ scores: Object.entries(scores).filter(([, value]) => value !== "").map(([criterionId, value]) => ({ criterionId, value: Number(value) })), comments });
  const locked = !canScore || assignment.status !== "assigned", hackathon = assignment.packet?.track !== null && assignment.packet?.track !== undefined;
  const total = assignment.rubric?.reduce((sum, criterion) => sum + Number(scores[criterion.id] || 0), 0) ?? 0, maximum = assignment.rubric?.reduce((sum, criterion) => sum + criterion.max, 0) ?? 0;
  return <article className="staff-panel competition-assignment" lang="en" dir="ltr"><h2>{assignment.title}</h2><p className="staff-status">{assignment.status}</p>
    {assignment.packet ? <div className="competition-packet"><h3>{assignment.packet.title}</h3>{assignment.packet.track ? <p>{HACKATHON_TRACKS[assignment.packet.track as keyof typeof HACKATHON_TRACKS]}</p> : null}<p>{assignment.packet.pitch || assignment.packet.narrative}</p>{assignment.packet.references ? <section><h4>References</h4><p>{assignment.packet.references}</p></section> : null}{assignment.packet.links?.length ? <section><h4>Supporting links</h4><ul>{assignment.packet.links.map((link, index) => <li key={index}><a href={link} target="_blank" rel="noreferrer" referrerPolicy="no-referrer">{link}</a></li>)}</ul></section> : null}</div> : <p>{copy.blocked}</p>}
    {hackathon ? <p className="staff-note">{mode === "judge" ? HACKATHON_FINAL_FAIRNESS : HACKATHON_SCREENING_FAIRNESS}</p> : null}
    {mode === "judge" && assignment.files?.length ? <section><h3>Private final presentation material</h3><ul>{assignment.files.map((file) => <PrivateFile key={file.id} file={file} entryId={assignment.entryId} busy={busy} act={act} />)}</ul></section> : null}
    <form onSubmit={(event) => { event.preventDefault(); void act(mode === "judge" ? "judge" : "review", { assignmentId: assignment.id, expectedVersion: assignment.version, scorecard: card(), submit: true }); }}><fieldset disabled={busy || locked}><legend>{mode === "judge" ? copy.judgeTitle : copy.reviewTitle}</legend>
      {(assignment.rubric ?? []).map((criterion) => <section className="competition-rubric" key={criterion.id}><div className="field"><label className="field-label" htmlFor={`${assignment.id}-${criterion.id}`}>{criterion.label} ({criterion.min}–{criterion.max})</label><CompetitionCriterionGuidance criterion={criterion} /><input className="field-input" id={`${assignment.id}-${criterion.id}`} type="number" step={hackathon ? "1" : "any"} required min={criterion.min} max={criterion.max} value={scores[criterion.id] ?? ""} onChange={(event) => setScores((current) => ({ ...current, [criterion.id]: event.target.value }))} /></div></section>)}
      <p aria-live="polite">Total: {total} / {maximum}</p><div className="field"><label className="field-label" htmlFor={`${assignment.id}-comments`}>{copy.comments}</label><textarea className="field-input" id={`${assignment.id}-comments`} rows={4} maxLength={12000} value={comments} onChange={(event) => setComments(event.target.value)} /></div>
      <div className="staff-actions"><Button size="small" variant="secondary" onClick={() => { void act(mode === "judge" ? "judge" : "review", { assignmentId: assignment.id, expectedVersion: assignment.version, scorecard: card(), submit: false }); }}>{copy.draft}</Button><Button type="submit" size="small" disabled={!assignment.packet || !assignment.rubric?.length}>{copy.submit}</Button></div>
    </fieldset></form>
    {hackathon && mode === "judge" ? <form onSubmit={(event) => { event.preventDefault(); void act("judge_concern", { assignmentId: assignment.id, expectedVersion: assignment.version, category, reason: concern }); }}><fieldset disabled={busy || !canScore || !["assigned", "completed"].includes(assignment.status)}><legend>Refer a concern to the committee</legend><p>Record originality, ethics, privacy or safety concerns separately from scores. A flag requires committee review; it does not exclude a team automatically.</p><div className="field"><label className="field-label" htmlFor={`${assignment.id}-concern-category`}>Concern category</label><select className="field-input" id={`${assignment.id}-concern-category`} value={category} onChange={(event) => setCategory(event.target.value)}>{["originality", "ethics", "privacy", "safety"].map((option) => <option key={option} value={option}>{option}</option>)}</select></div><div className="field"><label className="field-label" htmlFor={`${assignment.id}-concern`}>Evidence and reason</label><textarea className="field-input" id={`${assignment.id}-concern`} required rows={4} maxLength={12000} value={concern} onChange={(event) => setConcern(event.target.value)} /></div><Button size="small" type="submit" variant="secondary">Refer concern</Button></fieldset></form> : null}
    <form onSubmit={(event) => { event.preventDefault(); void act(mode === "judge" ? "judge_conflict" : "conflict", { assignmentId: assignment.id, expectedVersion: assignment.version, reason }); }}><fieldset disabled={busy || !canScore || !["assigned", "completed"].includes(assignment.status)}><legend>{copy.conflict}</legend><div className="field"><label className="field-label" htmlFor={`${assignment.id}-conflict`}>{copy.conflictReason}</label><textarea className="field-input" id={`${assignment.id}-conflict`} required maxLength={12000} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} /></div><Button size="small" type="submit" variant="secondary">{copy.conflict}</Button></fieldset></form>
  </article>;
}
