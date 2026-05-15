import json, re, sys

DESTRUCTIVE_PATTERNS = [
    # Filesystem
    (r'\brm\s+-[^\s]*r[^\s]*\s', "recursive rm"),
    (r'\brm\s+--recursive\b', "recursive rm"),
    (r'\brm\s+-[^\s]*f[^\s]*\s', "force rm"),
    (r'\brmdir\b', "rmdir"),
    (r'\bshred\b', "shred"),

    # SQL
    (r'\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW)\b', "DROP statement"),
    (r'\bTRUNCATE\b', "TRUNCATE statement"),
    (r'\bDELETE\s+FROM\b(?!\s+\S+\s+WHERE\b)', "DELETE without WHERE"),

    # Package/system
    (r'\bapt(-get)?\s+remove\b', "package removal"),
    (r'\bpip\s+uninstall\b', "pip uninstall"),

    # Git
    (r'\bgit\s+reset\s+--hard\b', "git reset --hard"),
    (r'\bgit\s+(push\s+)?--force\b', "force push"),
    (r'\bgit\s+clean\s+-[^\s]*f', "git clean -f"),
    (r'\bgit\s+branch\s+-D\b', "git branch -D"),

    # Process/system
    (r'\bkillall\b', "killall"),
    (r'\bpkill\b', "pkill"),
    (r'\b:(){ :\|:& };:\b', "fork bomb"),
]

data = json.load(sys.stdin)
command = data.get("tool_input", {}).get("command", "")

for pattern, label in DESTRUCTIVE_PATTERNS:
    if re.search(pattern, command, re.IGNORECASE):
        print(f"BLOCKED: destructive command detected ({label}). Confirm with user before proceeding.")
        sys.exit(1)
