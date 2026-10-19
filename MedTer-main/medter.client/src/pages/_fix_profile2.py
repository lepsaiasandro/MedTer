# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(__file__).with_name("Profile.tsx")
lines = p.read_text(encoding="utf-8").splitlines()
lines[641] = (
    '            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", '
    'margin: "0 0 14px" }}>{t("ჩემი სერტიფიკატები", "My Certificates")}</h3>'
)
p.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("ok")
print(lines[641])
bad = [i for i, line in enumerate(lines, 1) if "\ufffd" in line]
print("bad lines:", bad)
