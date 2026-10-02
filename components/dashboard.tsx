"use client";

import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import {
  CalendarDays,
  Check,
  Cloud,
  Clock3,
  Dumbbell,
  FolderKanban,
  GraduationCap,
  GripVertical,
  House,
  ListChecks,
  LogIn,
  LogOut,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Status = "todo" | "in_progress" | "done";
type Area =
  | "Casa"
  | "Salute e fitness"
  | "Formazione"
  | "Progetti"
  | "Amministrazione";
type View = "board" | "backlog" | "capacity";
type CloudStatus = "local" | "loading" | "saving" | "saved" | "error";

type CapacityPlan = {
  sleepHours: number;
  workHoursPerDay: number;
  workDays: number;
  travelHours: number;
  appointmentHours: number;
  socialHours: number;
};

type Task = {
  id: string;
  title: string;
  estimateMinutes: number;
  actualMinutes: number;
  status: Status;
};

type Story = {
  id: string;
  title: string;
  summary: string;
  area: Area;
  epic: string;
  sprint: number | null;
  closed: boolean;
  tasks: Task[];
};

type SelectedTask = { storyId: string; taskId: string };

const areas: Array<{ name: Area; icon: typeof House; color: string }> = [
  { name: "Casa", icon: House, color: "var(--area-home)" },
  { name: "Salute e fitness", icon: Dumbbell, color: "var(--area-health)" },
  { name: "Formazione", icon: GraduationCap, color: "var(--area-learning)" },
  { name: "Progetti", icon: FolderKanban, color: "var(--area-projects)" },
  { name: "Amministrazione", icon: ListChecks, color: "var(--area-admin)" },
];

const columns: Array<{ id: Status; title: string }> = [
  { id: "todo", title: "To do" },
  { id: "in_progress", title: "In progress" },
  { id: "done", title: "Done" },
];

function isoWeekInfo(input: Date) {
  const date = new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

function isoWeeksInYear(year: number) {
  return isoWeekInfo(new Date(Date.UTC(year, 11, 28))).week;
}

function nextIsoWeek(input: Date) {
  const nextWeek = new Date(input);
  nextWeek.setDate(input.getDate() + 7);
  return isoWeekInfo(nextWeek);
}

function firstDayOfIsoWeek(year: number, week: number) {
  const fourthOfJanuary = new Date(Date.UTC(year, 0, 4));
  const weekday = fourthOfJanuary.getUTCDay() || 7;
  fourthOfJanuary.setUTCDate(fourthOfJanuary.getUTCDate() - weekday + 1 + (week - 1) * 7);
  return fourthOfJanuary;
}

const sprintYear = isoWeekInfo(new Date()).year;
const sprintCount = isoWeeksInYear(sprintYear);
const defaultSprint = nextIsoWeek(new Date()).week;
const sprintOptions = Array.from({ length: sprintCount }, (_, index) => index + 1);
const hoursInWeek = 168;
const initialCapacityPlan: CapacityPlan = { sleepHours: 49, workHoursPerDay: 10, workDays: 5, travelHours: 0, appointmentHours: 0, socialHours: 0 };

const seedStories: Story[] = [
  {
    id: "meal-prep",
    title: "Meal prep della settimana",
    summary: "Organizzare pasti e porzioni per i pranzi della settimana.",
    area: "Casa",
    epic: "Cucina",
    sprint: defaultSprint,
    closed: false,
    tasks: [
      { id: "shopping", title: "Fare la spesa", estimateMinutes: 45, actualMinutes: 0, status: "todo" },
      { id: "cook", title: "Cucinare e porzionare", estimateMinutes: 105, actualMinutes: 40, status: "in_progress" },
      { id: "menu", title: "Pianificare il menu", estimateMinutes: 20, actualMinutes: 20, status: "done" },
    ],
  },
  {
    id: "training",
    title: "Allenamento Gym",
    summary: "Completare le due sessioni di allenamento previste.",
    area: "Salute e fitness",
    epic: "Routine settimanale",
    sprint: defaultSprint,
    closed: false,
    tasks: [
      { id: "gym-a", title: "Sessione A — parte superiore", estimateMinutes: 70, actualMinutes: 0, status: "todo" },
      { id: "gym-b", title: "Sessione B — parte inferiore", estimateMinutes: 70, actualMinutes: 75, status: "done" },
    ],
  },
  {
    id: "i-agile",
    title: "MVP I-AGILE",
    summary: "Costruire la prima versione dell'app per organizzare le mansioni settimanali.",
    area: "Progetti",
    epic: "I-AGILE",
    sprint: defaultSprint,
    closed: false,
    tasks: [
      { id: "model", title: "Definire il modello storie e task", estimateMinutes: 90, actualMinutes: 75, status: "done" },
      { id: "taskboard", title: "Costruire la taskboard", estimateMinutes: 180, actualMinutes: 0, status: "todo" },
    ],
  },
];

function duration(minutes: number) {
  if (minutes === 0) return "—";
  const sign = minutes < 0 ? "−" : "";
  const absoluteMinutes = Math.abs(minutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const remainingMinutes = absoluteMinutes % 60;
  if (hours === 0) return `${sign}${remainingMinutes} min`;
  return remainingMinutes ? `${sign}${hours} h ${remainingMinutes} min` : `${sign}${hours} h`;
}

function sprintDateRange(sprint: number) {
  const monday = firstDayOfIsoWeek(sprintYear, sprint);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const formatter = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${formatter.format(monday)} – ${formatter.format(sunday)}`;
}

function areaMeta(area: Area) {
  return areas.find((entry) => entry.name === area) ?? areas[0];
}

function isArea(value: unknown): value is Area {
  return areas.some((area) => area.name === value);
}

function storyPoints(story: Story) {
  return story.tasks.reduce((total, task) => total + task.estimateMinutes, 0) / 30;
}

function formatPoints(points: number) {
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 }).format(points);
}

function isStatus(value: unknown): value is Status {
  return columns.some((column) => column.id === value);
}

function normaliseTask(value: Record<string, unknown>): Task {
  return {
    id: String(value.id ?? crypto.randomUUID()),
    title: String(value.title ?? "Task senza titolo"),
    estimateMinutes: Number(value.estimateMinutes ?? 0),
    actualMinutes: Number(value.actualMinutes ?? 0),
    status: isStatus(value.status) ? value.status : "todo",
  };
}

function normaliseHours(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normaliseCapacityPlan(value: Partial<CapacityPlan> | null | undefined): CapacityPlan {
  return {
    sleepHours: normaliseHours(value?.sleepHours, initialCapacityPlan.sleepHours),
    workHoursPerDay: normaliseHours(value?.workHoursPerDay, initialCapacityPlan.workHoursPerDay),
    workDays: normaliseHours(value?.workDays, initialCapacityPlan.workDays),
    travelHours: normaliseHours(value?.travelHours, initialCapacityPlan.travelHours),
    appointmentHours: normaliseHours(value?.appointmentHours, initialCapacityPlan.appointmentHours),
    socialHours: normaliseHours(value?.socialHours, initialCapacityPlan.socialHours),
  };
}

function normaliseSprint(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= sprintCount ? parsed : fallback;
}

function migrateLegacyItems(value: unknown, fallbackSprint: number): Story[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length === 0) return [];
  const first = value[0] as Record<string, unknown>;

  if (Array.isArray(first.tasks)) {
    return value.map((rawStory) => {
      const story = rawStory as Record<string, unknown>;
      const hasSprint = Object.prototype.hasOwnProperty.call(story, "sprint");
      return {
        id: String(story.id ?? crypto.randomUUID()),
        title: String(story.title ?? "Storia senza titolo"),
        summary: String(story.summary ?? story.description ?? story.notes ?? ""),
        area: isArea(story.area) ? story.area : "Casa",
        epic: String(story.epic ?? "Senza epica"),
        sprint: hasSprint && story.sprint === null ? null : normaliseSprint(story.sprint, fallbackSprint),
        closed: Boolean(story.closed),
        tasks: Array.isArray(story.tasks) ? story.tasks.map((task) => normaliseTask(task as Record<string, unknown>)) : [],
      };
    });
  }

  if (typeof first.title !== "string" || !isArea(first.area) || typeof first.epic !== "string") return null;

  const groups = new Map<string, Story>();
  for (const rawItem of value as Array<Record<string, unknown>>) {
    const area = isArea(rawItem.area) ? rawItem.area : "Casa";
    const epic = String(rawItem.epic ?? "Senza epica");
    const key = `${area}-${epic}`;
    const existing = groups.get(key);
    const task = normaliseTask(rawItem);
    if (existing) existing.tasks.push(task);
    else groups.set(key, { id: `story-${key}`, title: epic, summary: "", area, epic, sprint: fallbackSprint, closed: false, tasks: [task] });
  }
  return [...groups.values()];
}

function TaskCard({ task, story, onOpen }: { task: Task; story: Story; onOpen: (selection: SelectedTask) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `task:${story.id}:${task.id}` });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <article className={`task-card${isDragging ? " is-dragging" : ""}`} ref={setNodeRef} style={style} {...attributes}>
      <div className="task-card-topline">
        <span>{duration(task.estimateMinutes)}</span>
        <button className="drag-handle" type="button" aria-label={`Sposta ${task.title}`} {...listeners}><GripVertical size={16} /></button>
      </div>
      <button className="task-title" type="button" onClick={() => onOpen({ storyId: story.id, taskId: task.id })}>{task.title}</button>
      {task.actualMinutes > 0 && <footer><span className="actual-time"><Clock3 size={13} /> {duration(task.actualMinutes)}</span></footer>}
    </article>
  );
}

function TaskPreview({ task }: { task: Task }) {
  return (
    <div className="drag-preview">
      <article className="task-card">
        <div className="task-card-topline"><span>{duration(task.estimateMinutes)}</span></div>
        <h3 className="task-title">{task.title}</h3>
      </article>
    </div>
  );
}

function TaskCell({ storyId, status, children }: { storyId: string; status: Status; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `cell:${storyId}:${status}` });
  return <div className={`task-cell${isOver ? " is-over" : ""}`} ref={setNodeRef}>{children}</div>;
}

function StorySummary({ story, onClose, onEditStory }: { story: Story; onClose: (storyId: string) => void; onEditStory: (storyId: string) => void }) {
  const meta = areaMeta(story.area);
  const doneCount = story.tasks.filter((task) => task.status === "done").length;
  const points = storyPoints(story);

  return (
    <article className="story-summary" style={{ "--story-color": meta.color } as CSSProperties}>
      <div className="story-context"><span className="area-label"><span />{story.area}</span><span className="story-epic">{story.epic}</span></div>
      <h2>{story.title}</h2>
      {story.summary && <p className="story-description">{story.summary}</p>}
      <p>{doneCount}/{story.tasks.length} task completati <span className="story-point-value"><Sparkles size={12} /> {formatPoints(points)}</span></p>
      <select className="story-actions" aria-label={`Azioni per ${story.title}`} defaultValue="" onChange={(event) => { if (event.target.value === "close") onClose(story.id); if (event.target.value === "edit-story") onEditStory(story.id); event.currentTarget.value = ""; }}>
        <option value="" disabled>Azioni</option>
        <option value="edit-story">Modifica storia</option>
        <option value="close">Chiudi storia</option>
      </select>
    </article>
  );
}

function NewTaskDialog({ stories, onClose, onCreate }: { stories: Story[]; onClose: () => void; onCreate: (storyId: string, task: Task) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const storyId = String(form.get("story"));
    if (!title || !storyId) return;
    onCreate(storyId, {
      id: crypto.randomUUID(),
      title,
      estimateMinutes: Number(form.get("estimate")) || 0,
      actualMinutes: 0,
      status: "todo",
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="item-dialog" role="dialog" aria-modal="true" aria-labelledby="new-task-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><h2 id="new-task-title">Nuovo task</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Chiudi finestra"><X size={19} /></button></header>
        <form onSubmit={submit}>
          <label>Titolo<input autoFocus name="title" placeholder="Es. Fare la spesa" /></label>
          <div className="form-grid">
            <label>Storia<select name="story" defaultValue={stories[0]?.id}>{stories.map((story) => <option value={story.id} key={story.id}>{story.title}</option>)}</select></label>
            <label>Stima in minuti<input name="estimate" min="0" type="number" placeholder="60" /></label>
          </div>
          <footer><button className="button button-secondary" type="button" onClick={onClose}>Annulla</button><button className="button button-primary" type="submit"><Plus size={17} /> Crea task</button></footer>
        </form>
      </section>
    </div>
  );
}

function NewStoryDialog({ selectedSprint, onClose, onCreate }: { selectedSprint: number; onClose: () => void; onCreate: (story: Story) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;
    const selectedValue = String(form.get("sprint") ?? "");
    onCreate({
      id: crypto.randomUUID(),
      title,
      summary: String(form.get("summary") ?? "").trim(),
      area: String(form.get("area")) as Area,
      epic: String(form.get("epic") ?? "").trim() || "Senza epica",
      sprint: selectedValue ? Number(selectedValue) : null,
      closed: false,
      tasks: [],
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="item-dialog" role="dialog" aria-modal="true" aria-labelledby="new-story-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><h2 id="new-story-title">Nuova storia</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Chiudi finestra"><X size={19} /></button></header>
        <form onSubmit={submit}>
          <label>Titolo<input autoFocus name="title" placeholder="Es. Meal prep della settimana" /></label>
          <label>Descrizione / note<textarea name="summary" rows={3} placeholder="Es. Preparare i pranzi per i prossimi cinque giorni" /></label>
          <div className="form-grid">
            <label>Area<select name="area" defaultValue="Casa">{areas.map((area) => <option value={area.name} key={area.name}>{area.name}</option>)}</select></label>
            <label>Epica<input name="epic" placeholder="Es. Cucina" /></label>
            <label>Assegna allo sprint<select name="sprint" defaultValue=""><option value="">Backlog non assegnato</option>{sprintOptions.map((sprint) => <option value={sprint} key={sprint}>Sprint {sprint}{sprint === selectedSprint ? " · selezionato" : ""}</option>)}</select></label>
          </div>
          <footer><button className="button button-secondary" type="button" onClick={onClose}>Annulla</button><button className="button button-primary" type="submit"><Plus size={17} /> Crea storia</button></footer>
        </form>
      </section>
    </div>
  );
}

function EditStoryDialog({ story, onClose, onSave }: { story: Story; onClose: () => void; onSave: (story: Story) => void }) {
  const [title, setTitle] = useState(story.title);
  const [summary, setSummary] = useState(story.summary);
  const [area, setArea] = useState<Area>(story.area);
  const [epic, setEpic] = useState(story.epic);
  const [sprint, setSprint] = useState(story.sprint ? String(story.sprint) : "");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    onSave({ ...story, title: title.trim(), summary: summary.trim(), area, epic: epic.trim() || "Senza epica", sprint: sprint ? Number(sprint) : null });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="item-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-story-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><h2 id="edit-story-title">Modifica storia</h2><p className="dialog-context">Le task già presenti rimangono nella storia.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Chiudi finestra"><X size={19} /></button></header>
        <form onSubmit={submit}>
          <label>Titolo<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
          <label>Descrizione / note<textarea rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
          <div className="form-grid">
            <label>Area<select value={area} onChange={(event) => setArea(event.target.value as Area)}>{areas.map((item) => <option value={item.name} key={item.name}>{item.name}</option>)}</select></label>
            <label>Epica<input value={epic} onChange={(event) => setEpic(event.target.value)} /></label>
            <label>Assegna allo sprint<select value={sprint} onChange={(event) => setSprint(event.target.value)}><option value="">Backlog non assegnato</option>{sprintOptions.map((item) => <option value={item} key={item}>Sprint {item}</option>)}</select></label>
          </div>
          <footer><button className="button button-secondary" type="button" onClick={onClose}>Annulla</button><button className="button button-primary" type="submit">Salva storia</button></footer>
        </form>
      </section>
    </div>
  );
}

function SignInDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    setIsSubmitting(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setIsSubmitting(false);
    setMessage(error ? "Non è stato possibile inviare il link. Riprova." : "Controlla la tua email e apri il link per accedere.");
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="item-dialog sign-in-dialog" role="dialog" aria-modal="true" aria-labelledby="sign-in-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><h2 id="sign-in-title">Accedi a I-AGILE</h2><p className="dialog-context">I tuoi dati saranno salvati in modo privato e sincronizzati.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Chiudi finestra"><X size={19} /></button></header>
        <form onSubmit={submit}>
          <label>Email<input autoFocus name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" required /></label>
          {message && <p className="form-message">{message}</p>}
          <footer><button className="button button-secondary" type="button" onClick={onClose}>Annulla</button><button className="button button-primary" type="submit" disabled={isSubmitting}><LogIn size={17} /> {isSubmitting ? "Invio…" : "Invia link"}</button></footer>
        </form>
      </section>
    </div>
  );
}

function TaskDetails({ story, task, onClose, onUpdate, onDelete }: { story: Story; task: Task; onClose: () => void; onUpdate: (task: Task) => void; onDelete: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [estimateMinutes, setEstimateMinutes] = useState(String(task.estimateMinutes));
  const [actualMinutes, setActualMinutes] = useState(String(task.actualMinutes || ""));
  const [status, setStatus] = useState<Status>(task.status);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUpdate({
      ...task,
      title: title.trim() || task.title,
      estimateMinutes: Math.max(0, Number(estimateMinutes) || 0),
      actualMinutes: Math.max(0, Number(actualMinutes) || 0),
      status,
    });
    onClose();
  }

  function confirmDelete() {
    if (window.confirm(`Eliminare definitivamente la task “${task.title}”?`)) {
      onDelete();
      onClose();
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="task-details-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div className="detail-context"><span>{story.title}</span><p>{story.area} · {story.epic}</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Chiudi dettagli"><X size={19} /></button></header>
        <form className="task-edit-form" onSubmit={save}>
          <h2 id="task-details-title">Modifica task</h2>
          <label className="status-field">Nome task<input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
          <label className="status-field">Stima (minuti)<input type="number" min="0" value={estimateMinutes} onChange={(event) => setEstimateMinutes(event.target.value)} /></label>
          <label className="status-field">Stato<select value={status} onChange={(event) => setStatus(event.target.value as Status)}><option value="todo">To do</option><option value="in_progress">In progress</option><option value="done">Done</option></select></label>
          <label className="status-field">Tempo effettivo (minuti)<input type="number" min="0" value={actualMinutes} placeholder="0" onChange={(event) => setActualMinutes(event.target.value)} /></label>
          <footer><button className="delete-story-button" type="button" onClick={confirmDelete}><Trash2 size={16} /> Elimina</button><button className="button button-secondary" type="button" onClick={onClose}>Annulla</button>{status !== "done" && <button className="button button-secondary" type="button" onClick={() => setStatus("done")}><Check size={17} /> Segna completato</button>}<button className="button button-primary" type="submit">Salva task</button></footer>
        </form>
      </aside>
    </div>
  );
}

function Backlog({ stories, onAssignSprint, onDelete, onEditStory }: { stories: Story[]; onAssignSprint: (storyId: string, sprint: number | null) => void; onDelete: (storyId: string) => void; onEditStory: (storyId: string) => void }) {
  function confirmDelete(story: Story) {
    if (window.confirm(`Eliminare definitivamente la storia “${story.title}” e le sue ${story.tasks.length} task?`)) onDelete(story.id);
  }

  return (
    <section className="backlog-list" aria-label="Storie nel backlog">
      <div className="backlog-list-header"><span>Storie aperte</span><strong>{stories.length}</strong></div>
      {stories.length === 0 ? <p className="empty-board">Non ci sono storie aperte per questa area.</p> : stories.map((story) => {
        const meta = areaMeta(story.area);
        const points = storyPoints(story);
        return (
          <article className="backlog-story" key={story.id} style={{ "--story-color": meta.color } as CSSProperties}>
            <div className="backlog-story-main">
              <p><span className="area-label"><span />{story.area}</span><span className="story-epic">{story.epic}</span></p>
              <h2>{story.title}</h2>
              {story.summary && <p className="backlog-story-summary">{story.summary}</p>}
              <button className="edit-story-notes" type="button" onClick={() => onEditStory(story.id)}>Modifica storia</button>
              <small>{story.tasks.length} task <span className="story-point-value"><Sparkles size={12} /> {formatPoints(points)} punti</span></small>
            </div>
            <div className="backlog-story-actions"><label className="sprint-assignment">Sprint<select value={story.sprint ?? ""} onChange={(event) => onAssignSprint(story.id, event.target.value ? Number(event.target.value) : null)}><option value="">Backlog non assegnato</option>{sprintOptions.map((sprint) => <option value={sprint} key={sprint}>Sprint {sprint} · {sprintDateRange(sprint)}</option>)}</select></label><button className="delete-story-button" type="button" onClick={() => confirmDelete(story)} aria-label={`Elimina ${story.title}`}><Trash2 size={16} /> Elimina</button></div>
          </article>
        );
      })}
    </section>
  );
}

function Capacity({ plan, sprint, onChange }: { plan: CapacityPlan; sprint: number; onChange: (nextPlan: CapacityPlan) => void }) {
  const workHours = plan.workHoursPerDay * plan.workDays;
  const afterSleep = hoursInWeek - plan.sleepHours;
  const afterWork = afterSleep - workHours;
  const availableHours = afterWork - plan.travelHours - plan.appointmentHours - plan.socialHours;

  function update(field: keyof CapacityPlan, value: string) {
    onChange({ ...plan, [field]: normaliseHours(value, 0) });
  }

  return (
    <>
      <header className="minimal-header"><div><h1>Capacity</h1><p className="week-meta"><Clock3 size={15} /> Sprint {sprint} · {sprintDateRange(sprint)}</p></div></header>
      <section className="capacity-ledger" aria-label="Calcolo della capacità settimanale">
        <div className="ledger-row ledger-start"><div><span>Ore nella settimana</span><small>24 ore × 7 giorni</small></div><strong>{hoursInWeek} h</strong></div>
        <div className="ledger-row ledger-cost"><div><span>Sonno</span><small>Totale settimanale</small></div><label><span>Ore</span><input aria-label="Ore di sonno settimanali" type="number" min="0" value={plan.sleepHours} onChange={(event) => update("sleepHours", event.target.value)} /></label></div>
        <div className="ledger-balance"><span>Dopo il sonno</span><strong>{duration(afterSleep * 60)}</strong></div>
        <div className="ledger-row ledger-cost"><div><span>Lavoro</span><small>Ore al giorno × giorni lavorativi</small></div><div className="work-inputs"><label><span>Ore/giorno</span><input aria-label="Ore di lavoro al giorno" type="number" min="0" value={plan.workHoursPerDay} onChange={(event) => update("workHoursPerDay", event.target.value)} /></label><span>×</span><label><span>Giorni</span><input aria-label="Giorni di lavoro" type="number" min="0" value={plan.workDays} onChange={(event) => update("workDays", event.target.value)} /></label><strong>= {duration(workHours * 60)}</strong></div></div>
        <div className="ledger-balance"><span>Dopo il lavoro</span><strong>{duration(afterWork * 60)}</strong></div>
        <div className="ledger-row ledger-cost"><div><span>Viaggi</span><small>Totale settimanale</small></div><label><span>Ore</span><input aria-label="Ore settimanali di viaggio" type="number" min="0" value={plan.travelHours} onChange={(event) => update("travelHours", event.target.value)} /></label></div>
        <div className="ledger-row ledger-cost"><div><span>Visite</span><small>Mediche, commissioni e appuntamenti</small></div><label><span>Ore</span><input aria-label="Ore settimanali di visite" type="number" min="0" value={plan.appointmentHours} onChange={(event) => update("appointmentHours", event.target.value)} /></label></div>
        <div className="ledger-row ledger-cost"><div><span>Uscite sociali</span><small>Totale settimanale</small></div><label><span>Ore</span><input aria-label="Ore settimanali di uscite sociali" type="number" min="0" value={plan.socialHours} onChange={(event) => update("socialHours", event.target.value)} /></label></div>
        <div className={`ledger-result${availableHours < 0 ? " is-negative" : ""}`}><div><span>Ore disponibili</span><small>Capacità residua per lo sprint</small></div><strong>{duration(availableHours * 60)}</strong></div>
      </section>
    </>
  );
}

export function Dashboard() {
  const [stories, setStories] = useState<Story[]>(seedStories);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);
  const [selectedArea, setSelectedArea] = useState<Area | "Tutte">("Tutte");
  const [view, setView] = useState<View>("board");
  const [selectedSprint, setSelectedSprint] = useState(defaultSprint);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isNewStoryOpen, setIsNewStoryOpen] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [capacityPlan, setCapacityPlan] = useState<CapacityPlan>(initialCapacityPlan);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("local");
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const storiesRef = useRef(stories);
  const capacityPlanRef = useRef(capacityPlan);
  const syncQueueRef = useRef(Promise.resolve());
  const syncRevisionRef = useRef(0);

  useEffect(() => {
    const storedBoard = window.localStorage.getItem("i-agile-board");
    const storedCapacityPlan = window.localStorage.getItem("i-agile-capacity-plan");
    if (storedBoard) {
      try {
        const restored = migrateLegacyItems(JSON.parse(storedBoard), defaultSprint);
        if (restored) {
          storiesRef.current = restored;
          setStories(restored);
        }
      } catch { /* Keep useful examples when stored data is malformed. */ }
    }
    if (storedCapacityPlan) {
      try {
        const restoredPlan = normaliseCapacityPlan(JSON.parse(storedCapacityPlan) as Partial<CapacityPlan>);
        capacityPlanRef.current = restoredPlan;
        setCapacityPlan(restoredPlan);
      } catch { /* Keep the initial capacity plan when stored data is malformed. */ }
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    storiesRef.current = stories;
    if (isReady) window.localStorage.setItem("i-agile-board", JSON.stringify(stories));
  }, [stories, isReady]);

  useEffect(() => {
    capacityPlanRef.current = capacityPlan;
    if (isReady) window.localStorage.setItem("i-agile-capacity-plan", JSON.stringify(capacityPlan));
  }, [capacityPlan, isReady]);

  useEffect(() => {
    if (!supabase) return;
    let isMounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (isMounted) setUser(data.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCloudUserId(null);
    });
    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !user || !isReady) {
      setCloudUserId(null);
      setCloudStatus("local");
      return;
    }
    let isMounted = true;
    setCloudStatus("loading");
    void (async () => {
      const { data, error } = await supabase.from("app_states").select("stories, capacity_plan").eq("user_id", user.id).maybeSingle();
      if (!isMounted) return;
      if (error) {
        setCloudStatus("error");
        return;
      }
      if (data) {
        const restoredStories = migrateLegacyItems(data.stories, defaultSprint);
        if (restoredStories) {
          storiesRef.current = restoredStories;
          setStories(restoredStories);
        }
        const restoredPlan = normaliseCapacityPlan(data.capacity_plan as Partial<CapacityPlan>);
        capacityPlanRef.current = restoredPlan;
        setCapacityPlan(restoredPlan);
      } else {
        const { error: createError } = await supabase.from("app_states").upsert({ user_id: user.id, stories: storiesRef.current, capacity_plan: capacityPlanRef.current });
        if (!isMounted) return;
        if (createError) {
          setCloudStatus("error");
          return;
        }
      }
      setCloudUserId(user.id);
      setCloudStatus("saved");
    })();
    return () => { isMounted = false; };
  }, [user?.id, isReady]);

  const visibleStories = useMemo(() => stories.filter((story) => !story.closed && (selectedArea === "Tutte" || story.area === selectedArea)), [stories, selectedArea]);
  const boardStories = useMemo(() => visibleStories.filter((story) => story.sprint === selectedSprint), [visibleStories, selectedSprint]);
  const boardTasks = boardStories.flatMap((story) => story.tasks);
  const completedTasks = boardTasks.filter((task) => task.status === "done");
  const plannedMinutes = boardTasks.reduce((total, task) => total + task.estimateMinutes, 0);
  const completedMinutes = completedTasks.reduce((total, task) => total + (task.actualMinutes || task.estimateMinutes), 0);
  const completedPoints = boardStories.filter((story) => story.tasks.length > 0 && story.tasks.every((task) => task.status === "done")).reduce((total, story) => total + storyPoints(story), 0);
  const totalSprintPoints = boardStories.reduce((total, story) => total + storyPoints(story), 0);
  const availableHours = hoursInWeek - capacityPlan.sleepHours - (capacityPlan.workHoursPerDay * capacityPlan.workDays) - capacityPlan.travelHours - capacityPlan.appointmentHours - capacityPlan.socialHours;
  const sprintPointCapacity = Math.max(0, availableHours * 2);
  const remainingSprintPoints = Math.max(0, sprintPointCapacity - totalSprintPoints);
  const capacityMinutes = availableHours * 60;
  const completionPercent = capacityMinutes > 0 ? Math.min(100, Math.round((completedMinutes / capacityMinutes) * 100)) : 0;
  const cloudStatusLabel = cloudStatus === "loading" ? "Caricamento" : cloudStatus === "saving" ? "Salvataggio" : cloudStatus === "saved" ? "Salvato" : cloudStatus === "error" ? "Errore sync" : "Solo locale";
  const details = selectedTask ? (() => {
    const story = stories.find((candidate) => candidate.id === selectedTask.storyId);
    const task = story?.tasks.find((candidate) => candidate.id === selectedTask.taskId);
    return story && task ? { story, task } : null;
  })() : null;
  const storyForEdit = editingStoryId ? stories.find((story) => story.id === editingStoryId) ?? null : null;

  function syncToCloud(nextStories: Story[], nextCapacityPlan: CapacityPlan) {
    const client = supabase;
    if (!client || !user || cloudUserId !== user.id) return;
    const revision = ++syncRevisionRef.current;
    setCloudStatus("saving");
    syncQueueRef.current = syncQueueRef.current.catch(() => undefined).then(async () => {
      const { error } = await client.from("app_states").upsert({ user_id: user.id, stories: nextStories, capacity_plan: nextCapacityPlan });
      if (revision === syncRevisionRef.current) setCloudStatus(error ? "error" : "saved");
    });
  }

  function commitStories(nextStories: Story[]) {
    storiesRef.current = nextStories;
    setStories(nextStories);
    if (isReady) window.localStorage.setItem("i-agile-board", JSON.stringify(nextStories));
    syncToCloud(nextStories, capacityPlanRef.current);
  }

  function commitCapacityPlan(nextPlan: CapacityPlan) {
    capacityPlanRef.current = nextPlan;
    setCapacityPlan(nextPlan);
    if (isReady) window.localStorage.setItem("i-agile-capacity-plan", JSON.stringify(nextPlan));
    syncToCloud(storiesRef.current, nextPlan);
  }

  function updateTask(storyId: string, task: Task) {
    commitStories(storiesRef.current.map((story) => story.id === storyId ? { ...story, tasks: story.tasks.map((candidate) => candidate.id === task.id ? task : candidate) } : story));
  }

  function createTask(storyId: string, task: Task) {
    commitStories(storiesRef.current.map((story) => story.id === storyId ? { ...story, tasks: [...story.tasks, task] } : story));
    setIsNewTaskOpen(false);
  }

  function deleteTask(storyId: string, taskId: string) {
    commitStories(storiesRef.current.map((story) => story.id === storyId ? { ...story, tasks: story.tasks.filter((task) => task.id !== taskId) } : story));
    setSelectedTask(null);
  }

  function createStory(story: Story) {
    commitStories([...storiesRef.current, story]);
    setIsNewStoryOpen(false);
  }

  function closeStory(storyId: string) {
    commitStories(storiesRef.current.map((story) => story.id === storyId ? { ...story, closed: true } : story));
  }

  function assignSprint(storyId: string, sprint: number | null) {
    commitStories(storiesRef.current.map((story) => story.id === storyId ? { ...story, sprint } : story));
  }

  function deleteStory(storyId: string) {
    commitStories(storiesRef.current.filter((story) => story.id !== storyId));
    setSelectedTask((current) => current?.storyId === storyId ? null : current);
  }

  function updateStory(updatedStory: Story) {
    commitStories(storiesRef.current.map((story) => story.id === updatedStory.id ? updatedStory : story));
    setEditingStoryId(null);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setCloudUserId(null);
  }

  function handleDragStart(event: { active: { id: string | number } }) {
    const [, storyId, taskId] = String(event.active.id).split(":");
    const story = storiesRef.current.find((candidate) => candidate.id === storyId);
    setActiveTask(story?.tasks.find((task) => task.id === taskId) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    if (!event.over) return;
    const [, sourceStoryId, taskId] = String(event.active.id).split(":");
    const [, targetStoryId, destination] = String(event.over.id).split(":");
    if (sourceStoryId !== targetStoryId || !columns.some((column) => column.id === destination)) return;
    const story = storiesRef.current.find((candidate) => candidate.id === sourceStoryId);
    const task = story?.tasks.find((candidate) => candidate.id === taskId);
    if (task) updateTask(sourceStoryId, { ...task, status: destination as Status });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="top-brand"><span className="brand-mark"><span /><span /><span /></span><span>I-AGILE</span></div>
          <nav className="top-navigation" aria-label="Navigazione principale"><button className={`top-nav-button${view === "board" ? " selected" : ""}`} type="button" onClick={() => setView("board")}><CalendarDays size={15} /> Taskboard</button><button className={`top-nav-button${view === "backlog" ? " selected" : ""}`} type="button" onClick={() => setView("backlog")}><ListChecks size={15} /> Backlog</button><button className={`top-nav-button${view === "capacity" ? " selected" : ""}`} type="button" onClick={() => setView("capacity")}><Clock3 size={15} /> Capacity</button></nav>
          {view !== "capacity" && <label className="area-filter-control">Area<select value={selectedArea} onChange={(event) => setSelectedArea(event.target.value as Area | "Tutte")}><option value="Tutte">Tutte le aree</option>{areas.map((area) => <option value={area.name} key={area.name}>{area.name}</option>)}</select></label>}
          {isSupabaseConfigured && <div className="cloud-account">{user ? <><span className={`cloud-status ${cloudStatus}`} title={cloudStatusLabel}><Cloud size={14} /> {cloudStatusLabel}</span><button className="account-button" type="button" onClick={signOut} title={`Esci da ${user.email ?? "I-AGILE"}`}><LogOut size={15} /> Esci</button></> : <button className="account-button" type="button" onClick={() => setIsSignInOpen(true)}><LogIn size={15} /> Accedi</button>}</div>}
        </div>
      </header>

      <section className="workspace">
        <div className="content">
          {view === "board" ? <>
            <header className="minimal-header"><div><div className="sprint-heading"><h1>Sprint {selectedSprint}</h1><select aria-label="Seleziona sprint" value={selectedSprint} onChange={(event) => setSelectedSprint(Number(event.target.value))}>{sprintOptions.map((sprint) => <option value={sprint} key={sprint}>Sprint {sprint}</option>)}</select></div><p className="week-meta"><CalendarDays size={15} /> {sprintDateRange(selectedSprint)} <span>·</span> {duration(capacityMinutes)} disponibili <span>·</span> {duration(completedMinutes)} completate <span>·</span> {formatPoints(completedPoints)} punti</p></div><div className="header-actions"><div className="sprint-points" aria-label="Punti dello sprint"><div><span>Punti totali</span><strong>{formatPoints(totalSprintPoints)}</strong></div><div><span>Punti rimanenti</span><strong>{formatPoints(remainingSprintPoints)}</strong><small>su {formatPoints(sprintPointCapacity)}</small></div></div><button className="button button-primary add-button" type="button" disabled={boardStories.length === 0} onClick={() => setIsNewTaskOpen(true)}><Plus size={18} /> Aggiungi task</button></div></header>

            <section className="summary-strip" aria-label="Riepilogo dello sprint"><div className="summary-main"><span>Capacità</span><strong>{duration(capacityMinutes)}</strong></div><div className="summary-main"><span>Pianificato</span><strong>{duration(plannedMinutes)}</strong><small>{plannedMinutes > capacityMinutes ? "Oltre la capacità" : "Entro la capacità"}</small></div><div className="summary-main"><span>Completato</span><strong>{duration(completedMinutes)}</strong><div className="progress-track"><span style={{ width: `${completionPercent}%` }} /></div></div><div className="summary-main points-summary"><span>Punti completati</span><strong><Sparkles size={19} /> {formatPoints(completedPoints)}</strong></div></section>

            <DndContext id="i-agile-taskboard" onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveTask(null)}>
              <div className="board-scroll">
                <section className="taskboard" aria-label={`Taskboard dello sprint ${selectedSprint}`}>
                  <header className="taskboard-header"><span>Storia</span>{columns.map((column) => <span key={column.id}>{column.title}</span>)}</header>
                  {boardStories.map((story) => <section className="story-row" key={story.id}><StorySummary story={story} onClose={closeStory} onEditStory={setEditingStoryId} />{columns.map((column) => <TaskCell storyId={story.id} status={column.id} key={column.id}>{story.tasks.filter((task) => task.status === column.id).map((task) => <TaskCard key={task.id} task={task} story={story} onOpen={setSelectedTask} />)}</TaskCell>)}</section>)}
                  {boardStories.length === 0 && <p className="empty-board">Non ci sono storie assegnate allo Sprint {selectedSprint} per questa area.</p>}
                </section>
              </div>
              <DragOverlay>{activeTask ? <TaskPreview task={activeTask} /> : null}</DragOverlay>
            </DndContext>
          </> : view === "backlog" ? <>
            <header className="minimal-header"><div><h1>Backlog</h1><p className="week-meta"><ListChecks size={15} /> Crea storie e assegnale a uno dei {sprintCount} sprint del {sprintYear}</p></div><button className="button button-primary add-button" type="button" onClick={() => setIsNewStoryOpen(true)}><Plus size={18} /> Nuova storia</button></header>
            <Backlog stories={visibleStories} onAssignSprint={assignSprint} onDelete={deleteStory} onEditStory={setEditingStoryId} />
          </> : <Capacity plan={capacityPlan} sprint={selectedSprint} onChange={commitCapacityPlan} />}
        </div>
      </section>

      {isNewTaskOpen && <NewTaskDialog stories={boardStories} onClose={() => setIsNewTaskOpen(false)} onCreate={createTask} />}
      {isNewStoryOpen && <NewStoryDialog selectedSprint={selectedSprint} onClose={() => setIsNewStoryOpen(false)} onCreate={createStory} />}
      {storyForEdit && <EditStoryDialog story={storyForEdit} onClose={() => setEditingStoryId(null)} onSave={updateStory} />}
      {isSignInOpen && <SignInDialog onClose={() => setIsSignInOpen(false)} />}
      {details && <TaskDetails story={details.story} task={details.task} onClose={() => setSelectedTask(null)} onUpdate={(task) => updateTask(details.story.id, task)} onDelete={() => deleteTask(details.story.id, details.task.id)} />}
    </main>
  );
}
