import os
import shutil

src_base = r"C:\Users\pokla\OneDrive - SPŠ a VOŠ Brno, Sokolská, příspěvková organizace\1-skola"
dest_base = os.getcwd()

mappings = {
    "Robotika": "robotika",
    "CNC": "cnc",
    "MTE": "mte",
    "SPS, MEC, CAD": ["sps", "mec"]  # Copy the combined folder to both sps and mec
}

def create_index(folder_path, title):
    index_path = os.path.join(folder_path, "index.html")
    if not os.path.exists(index_path):
        html_content = f"""<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="utf-8">
    <title>{title} - Strojírenství</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; background: #fbf8f3; color: #333; }}
        a {{ text-decoration: none; color: #005b95; font-weight: bold; }}
        a:hover {{ text-decoration: underline; }}
        ul {{ list-style-type: none; padding: 0; }}
        li {{ background: white; margin-bottom: 10px; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }}
    </style>
</head>
<body>
    <h1>Materiály: {title}</h1>
    <p><a href="../index.html">← Zpět na rozcestník</a></p>
    <ul>
"""
        # List all files
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                if file != "index.html":
                    rel_dir = os.path.relpath(root, folder_path)
                    if rel_dir == ".":
                        rel_dir = ""
                    file_path = os.path.join(rel_dir, file).replace("\\", "/")
                    html_content += f'        <li><a href="{file_path}" target="_blank">{file}</a></li>\n'

        html_content += """    </ul>
</body>
</html>
"""
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(html_content)

for src_folder, dest_folders in mappings.items():
    if isinstance(dest_folders, str):
        dest_folders = [dest_folders]
        
    src_path = os.path.join(src_base, src_folder)
    
    if os.path.exists(src_path):
        for dest_folder in dest_folders:
            dest_path = os.path.join(dest_base, dest_folder)
            if not os.path.exists(dest_path):
                shutil.copytree(src_path, dest_path)
                print(f"Copied {src_folder} to {dest_folder}")
            create_index(dest_path, dest_folder.upper())
    else:
        print(f"Source not found: {src_path}")

print("Import a generování indexů dokončeno.")
