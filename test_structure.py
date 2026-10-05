import json

with open("site-structure.json", "r", encoding="utf-8") as f:
    data = json.load(f)

nav = data.get("nav", [])
titles = [item.get("title") for item in nav]
required = ["STT", "SPS", "MEC", "Robotika", "CNC", "MTE"]

missing = [req for req in required if req not in titles]
if missing:
    print(f"FAIL: Missing subjects {missing}")
    exit(1)
print("PASS")
