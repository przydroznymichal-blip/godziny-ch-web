"""Wysyła aplikację web Godziny CH do publicznego repo godziny-ch-web (GitHub Pages)."""
import subprocess, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
msg = sys.argv[1] if len(sys.argv) > 1 else "Aktualizacja"
def g(*a, ok=False):
    r = subprocess.run(["git", *a], capture_output=True, text=True)
    print("$ git", " ".join(a), "\n", (r.stdout + r.stderr).strip())
    if r.returncode and not ok: sys.exit(r.returncode)
if not os.path.isdir(".git"):
    g("init", "-b", "main")
    g("remote", "add", "origin", "git@github.com:przydroznymichal-blip/godziny-ch-web.git")
g("config", "user.name", "przydroznymichal-blip")
g("config", "user.email", "przydroznymichal-blip@users.noreply.github.com")
g("add", "-A")
g("commit", "-m", msg + "\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>", ok=True)
g("push", "-u", "origin", "main")
print("WYSLANO OK")
