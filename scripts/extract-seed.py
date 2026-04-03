"""
extract-seed.py
Reads the live OnTrack database and prints TypeScript INSERT OR IGNORE
statements for all tasks and documents, ready to paste into seed.ts.

Usage (run from the app folder):
    python scripts/extract-seed.py

Override the DB path if needed:
    python scripts/extract-seed.py "C:\\path\\to\\database.db"
"""

import sqlite3
import sys
import os

# ── Locate the database ───────────────────────────────────────────────────────

def default_db_path():
    app_name = "ontrack-dispatch-dashboard"
    if sys.platform == "win32":
        base = os.environ.get("APPDATA", os.path.expanduser("~\\AppData\\Roaming"))
        return os.path.join(base, app_name, "OnTrackDashboard", "database.db")
    elif sys.platform == "darwin":
        return os.path.expanduser(f"~/Library/Application Support/{app_name}/OnTrackDashboard/database.db")
    else:
        return os.path.expanduser(f"~/.config/{app_name}/OnTrackDashboard/database.db")

db_path = sys.argv[1] if len(sys.argv) > 1 else default_db_path()

if not os.path.exists(db_path):
    print(f"ERROR: Database not found at:\n  {db_path}", file=sys.stderr)
    print("Pass the path as an argument: python scripts/extract-seed.py \"C:\\path\\to\\database.db\"", file=sys.stderr)
    sys.exit(1)

print(f"Reading from: {db_path}", file=sys.stderr)

con = sqlite3.connect(db_path)
con.row_factory = sqlite3.Row

# ── Escape helpers ────────────────────────────────────────────────────────────

def ts(val):
    """Format a Python value as a TypeScript argument for .run()"""
    if val is None:
        return "null"
    if isinstance(val, int):
        return str(val)
    # Escape backslashes and single quotes for embedding in a JS single-quoted string
    s = str(val)
    s = s.replace("\\", "\\\\")
    s = s.replace("'", "\\'")
    s = s.replace("\n", "\\n")
    s = s.replace("\r", "")
    return f"'{s}'"

# ── Tasks ─────────────────────────────────────────────────────────────────────

tasks = con.execute(
    "SELECT id, title, category, priority, due_date, time_of_day, recurring, status, notes "
    "FROM tasks ORDER BY id"
).fetchall()

print("// ── TASKS (extracted from live database) ──────────────────────────────────")
print("function seedTasks(db: Database.Database): void {")
print("  const ins = db.prepare(")
print("    'INSERT OR IGNORE INTO tasks (id, title, category, priority, due_date, time_of_day, recurring, status, notes)' +")
print("    ' VALUES (?,?,?,?,?,?,?,?,?)'")
print("  )")
print()

for t in tasks:
    args = ",".join([
        ts(t["id"]),
        ts(t["title"]),
        ts(t["category"]),
        ts(t["priority"]),
        ts(t["due_date"]),
        ts(t["time_of_day"]),
        ts(t["recurring"]),
        ts(t["status"]),
        ts(t["notes"]),
    ])
    print(f"  ins.run({args})")

print("}")
print()

# ── Documents ─────────────────────────────────────────────────────────────────

docs = con.execute(
    "SELECT id, title, category, content, driver_id, doc_type, expiry_date "
    "FROM documents ORDER BY id"
).fetchall()

print("// ── DOCUMENTS (extracted from live database) ──────────────────────────────")
print("function seedDocuments(db: Database.Database): void {")
print("  const ins = db.prepare(")
print("    'INSERT OR IGNORE INTO documents (id, title, category, content, driver_id, doc_type, expiry_date)' +")
print("    ' VALUES (?,?,?,?,?,?,?)'")
print("  )")
print()

for d in docs:
    args = ",".join([
        ts(d["id"]),
        ts(d["title"]),
        ts(d["category"]),
        ts(d["content"]),
        ts(d["driver_id"]),
        ts(d["doc_type"]),
        ts(d["expiry_date"]),
    ])
    print(f"  ins.run({args})")

print("}")

con.close()
print("\nDone. Paste the output above into seed.ts.", file=sys.stderr)
