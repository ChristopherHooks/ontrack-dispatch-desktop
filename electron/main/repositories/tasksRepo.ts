import Database from 'better-sqlite3'
import type { Task, TaskCompletion, CreateTaskDto, UpdateTaskDto } from '../../../src/types/models'

export function listTasks(db: Database.Database, category?: string, dueDate?: string): Task[] {
  if (category && dueDate) return db.prepare('SELECT * FROM tasks WHERE category=? AND due_date=? ORDER BY time_of_day ASC').all(category, dueDate) as Task[]
  if (category) return db.prepare('SELECT * FROM tasks WHERE category=? ORDER BY due_date ASC, time_of_day ASC').all(category) as Task[]
  if (dueDate) return db.prepare('SELECT * FROM tasks WHERE due_date=? ORDER BY time_of_day ASC').all(dueDate) as Task[]
  return db.prepare('SELECT * FROM tasks ORDER BY due_date ASC, time_of_day ASC').all() as Task[]
}
export function getTask(db: Database.Database, id: number): Task | undefined {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined
}
export function createTask(db: Database.Database, dto: CreateTaskDto): Task {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const r = db.prepare('INSERT INTO tasks (title,category,priority,due_date,time_of_day,recurring,status,assigned_to,notes,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(dto.title, dto.category ?? null, dto.priority, dto.due_date ?? null, dto.time_of_day ?? null, dto.recurring ?? 0, dto.status, dto.assigned_to ?? null, dto.notes ?? null, now)
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(r.lastInsertRowid as number) as Task
}
export function updateTask(db: Database.Database, id: number, dto: UpdateTaskDto): Task | undefined {
  const existing = getTask(db, id)
  if (existing == null) return undefined
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const m = { ...existing, ...dto }
  db.prepare('UPDATE tasks SET title=?,category=?,priority=?,due_date=?,time_of_day=?,recurring=?,status=?,assigned_to=?,notes=?,updated_at=? WHERE id=?')
    .run(m.title, m.category, m.priority, m.due_date, m.time_of_day, m.recurring, m.status, m.assigned_to, m.notes, now, id)
  return getTask(db, id)
}
export function deleteTask(db: Database.Database, id: number): boolean {
  return db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes > 0
}
export function markTaskComplete(db: Database.Database, taskId: number, date: string, userId?: number): void {
  db.prepare('INSERT OR IGNORE INTO task_completions (task_id, completed_date, completed_by) VALUES (?, ?, ?)')
    .run(taskId, date, userId ?? null)
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run('Done', taskId)
}
export function markTaskIncomplete(db: Database.Database, taskId: number, date: string): void {
  db.prepare('DELETE FROM task_completions WHERE task_id = ? AND completed_date = ?').run(taskId, date)
  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run('Pending', taskId)
}
export function getTaskCompletions(db: Database.Database, taskId: number): TaskCompletion[] {
  return db.prepare('SELECT * FROM task_completions WHERE task_id = ? ORDER BY completed_date DESC').all(taskId) as TaskCompletion[]
}
