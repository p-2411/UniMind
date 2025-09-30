#!/usr/bin/env python3
"""
pdfs_to_text (pypdf-only) — Merge text from a folder of PDFs into a single .txt file.

USAGE
-----
Basic:
    python parsePDF.py /path/to/folder output.txt

Options:
    --recursive           Recurse into subfolders (default: off)
    --pattern "*.pdf"     Glob pattern to match PDFs (default: *.pdf)
    --sort "name|mtime"   Sort by filename or modification time (default: name)
    --encoding "utf-8"    Output file encoding (default: utf-8)
    --append              Append to output file instead of overwriting
"""

import argparse
import glob
import sys
import time
from pathlib import Path
from typing import List

def natural_key(s: str):
    import re
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def list_pdfs(folder: Path, pattern: str, recursive: bool, sort: str) -> List[Path]:
    if recursive:
        files = [Path(p) for p in glob.iglob(str(folder / "**" / pattern), recursive=True)]
    else:
        files = sorted(folder.glob(pattern))
    if sort == "name":
        files.sort(key=lambda p: natural_key(p.name))
    elif sort == "mtime":
        files.sort(key=lambda p: p.stat().st_mtime)
    return [p for p in files if p.is_file()]

def extract_text_pypdf(pdf_path: Path) -> str:
    try:
        from pypdf import PdfReader
    except Exception as e:
        print("[ERROR] Missing dependency: pypdf. Install with: pip install pypdf", file=sys.stderr)
        sys.exit(3)

    try:
        reader = PdfReader(str(pdf_path))
        parts = []
        for page in reader.pages:
            try:
                parts.append(page.extract_text() or "")
            except Exception:
                parts.append("")
        return "\n".join(parts)
    except Exception as e:
        return ""

def write_header(out, title: str, underline_char: str = "="):
    out.write(title + "\n")
    out.write(underline_char * len(title) + "\n\n")

def main():
    parser = argparse.ArgumentParser(description="Merge text from PDFs into a single text file (pypdf-only).")
    parser.add_argument("folder", type=str, help="Folder containing PDFs")
    parser.add_argument("output", type=str, help="Path to output .txt file")
    parser.add_argument("--recursive", action="store_true", help="Recurse into subfolders")
    parser.add_argument("--pattern", type=str, default="*.pdf", help="Glob pattern (default: *.pdf)")
    parser.add_argument("--sort", type=str, choices=["name", "mtime"], default="name", help="Sort order (default: name)")
    parser.add_argument("--encoding", type=str, default="utf-8", help="Encoding for output file")
    parser.add_argument("--append", action="store_true", help="Append to output file instead of overwriting")
    args = parser.parse_args()

    folder = Path(args.folder).expanduser().resolve()
    if not folder.exists() or not folder.is_dir():
        print(f"[ERROR] Folder not found: {folder}", file=sys.stderr)
        sys.exit(1)

    pdfs = list_pdfs(folder, args.pattern, args.recursive, args.sort)
    if not pdfs:
        print(f"[WARN] No PDFs matched pattern '{args.pattern}' in {folder}", file=sys.stderr)
        sys.exit(2)

    mode = "a" if args.append else "w"
    out_path = Path(args.output).expanduser().resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    total_files = len(pdfs)
    start_time = time.time()

    with open(out_path, mode, encoding=args.encoding, errors="replace") as out:
        write_header(out, "PDFs to Text — Consolidated Output (pypdf-only)", "=")
        out.write(f"Source folder: {folder}\n")
        out.write(f"Matched PDFs: {total_files}\n")
        out.write(f"Generated at: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        for fi, pdf in enumerate(pdfs, start=1):
            banner = f"[{fi}/{total_files}] {pdf.relative_to(folder)}"
            write_header(out, banner, "-")

            text = extract_text_pypdf(pdf)
            if text.strip():
                out.write(text.strip() + "\n\n")
            else:
                out.write("(No extractable text found by pypdf.)\n\n")

            out.write("\n" + "="*80 + "\n\n")

    elapsed = time.time() - start_time
    print(f"[DONE] Wrote {out_path} from {total_files} PDFs in {elapsed:.1f}s")

if __name__ == "__main__":
    main()