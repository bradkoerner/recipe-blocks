import json, sys, os

data = json.load(sys.stdin)
file_path = data.get("tool_input", {}).get("file_path", "")
session_id = data.get("session_id", "default")
state_file = f"/tmp/claude_reads_{session_id}.json"

try:
    with open(state_file) as f:
        reads = json.load(f)
except FileNotFoundError:
    reads = []

mode = data.get("hook_event_name", "PreToolUse")

if mode == "PostToolUse":
    if file_path and file_path not in reads:
        reads.append(file_path)
        with open(state_file, "w") as f:
            json.dump(reads, f)
elif file_path not in reads:
    print(f"BLOCKED: {file_path} has not been read this session. Read it first.")
    sys.exit(1)
