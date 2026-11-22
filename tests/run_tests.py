# -*- coding: utf-8 -*-
"""Прогон тестов доменной логики Finora через cscript (JScript 5.8, без Node).
Запуск: python tests/run_tests.py  (из корня проекта finora)"""
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

STUB = u'''function print(s){ WScript.Echo(s); }
'''

def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()

domain = read(os.path.join(ROOT, "src", "domain.js"))
tests = read(os.path.join(ROOT, "tests", "domain.test.js"))
js = STUB + "\n" + domain + "\n" + tests

run_js = os.path.join(ROOT, "tests", "_run.js")
with open(run_js, "w", encoding="cp1251", errors="replace", newline="\n") as f:
    f.write(js)

res = subprocess.run(["cscript", "//nologo", os.path.basename(run_js)],
                     cwd=os.path.dirname(run_js), capture_output=True,
                     text=True, encoding="cp1251", errors="replace")
os.remove(run_js)

# cscript печатает в кодировке консоли (cp866); вернули текст из mojibake
def fix(text):
    try:
        return text.encode("cp1251").decode("cp866")
    except Exception:
        return text

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
print(fix(res.stdout))
if res.stderr:
    print("STDERR:", fix(res.stderr)[:2000])
fixed_out = fix(res.stdout)
failed = "FAIL=" in fixed_out and "FAIL=0" not in fixed_out
sys.exit(1 if (failed or res.returncode != 0) else 0)
