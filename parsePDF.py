# Create the Python script file in the workspace
script_content = r'''#!/usr/bin/env python3
"""
pdfs_to_text.py — Merge text from a folder of PDFs into a single .txt file.

USAGE
-----
Basic:
    python pdfs_to_text.py /path/to/folder output.txt

Options:
    --recursive           Recurse into subfolders (default: off)
    --pattern "*.pdf"     Glob pattern to match PDFs (default: *.pdf)
    --sort "name|mtime"   Sort by filename or modification time (default: name)
    --ocr                 Attempt OCR on pages with no extractable text
    --lang "eng+... "     Tesseract language(s) for OCR (default: eng)
    --dpi 300             DPI for rendering pages before OCR (default: 300)
    --append              Append to output file instead of overwriting
    --encoding "utf-8"    Output file encoding (default: utf-8)

DEPENDENCIES
------------
Text extraction:
    - pypdf (recommended)          pip install pypdf

Optional OCR (only if you pass --ocr):
    - pytesseract, pdf2image, pillow
        pip install pytesseract pdf2image pillow
    - Tesseract OCR binary installed on your system and available in PATH.
      macOS:   brew install tesseract
      Ubuntu:  sudo apt-get install tesseract-ocr

NOTES
-----
- For digitally generated PDFs, pypdf usually suffices.
- For scanned PDFs (images only), pass --ocr to use Tesseract.
- The script writes clear section headers per file and page breaks.
"""

import argparse
import glob
import os
import sys
import time
from pathlib import Path
from typing import List, Tuple

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

def extract_text_pypdf(pdf_path: Path) -> Tuple[str, List[bool]]:
    """
    Returns (text, empty_page_flags) where empty_page_flags[i] is True
    if page i had no extractable text.
    """
    text_parts = []
    empty_flags = []
    try:
        from pypdf import PdfReader
        reader = PdfReader(str(pdf_path))
        for i, page in enumerate(reader.pages):
            try:
                txt = page.extract_text() or ""
            except Exception as e:
                txt = ""
            empty_flags.append(len(txt.strip()) == 0)
            text_parts.append(txt)
    except Exception as e:
        return ("", [])
    return ("\n".join(text_parts), empty_flags)

def ocr_pdf_pages(pdf_path: Path, page_indices: List[int], dpi: int, lang: str) -> List[str]:
    """
    OCR only specified page indices from pdf_path. Returns a list of text (same order as page_indices).
    """
    try:
        from pdf2image import convert_from_path
        import pytesseract
    except Exception as e:
        raise RuntimeError("OCR dependencies missing. Install: pip install pytesseract pdf2image pillow") from e

    # Render all pages first to avoid repeated loads (but only store what we need).
    # However, rendering all pages can be heavy; so we render selectively.
    texts = []
    for idx in page_indices:
        images = convert_from_path(str(pdf_path), dpi=dpi, first_page=idx+1, last_page=idx+1)
        if not images:
            texts.append("")
            continue
        txt = pytesseract.image_to_string(images[0], lang=lang) or ""
        texts.append(txt)
    return texts

def write_header(out, title: str, underline_char: str = "="):
    out.write(title + "\n")
    out.write(underline_char * len(title) + "\n\n")

def main():
    parser = argparse.ArgumentParser(description="Convert PDFs in a folder into a single text file.")
    parser.add_argument("folder", type=str, help="Folder containing PDFs")
    parser.add_argument("output", type=str, help="Path to output .txt file")
    parser.add_argument("--recursive", action="store_true", help="Recurse into subfolders")
    parser.add_argument("--pattern", type=str, default="*.pdf", help="Glob pattern (default: *.pdf)")
    parser.add_argument("--sort", type=str, choices=["name", "mtime"], default="name", help="Sort order (default: name)")
    parser.add_argument("--ocr", action="store_true", help="Attempt OCR for pages without extractable text")
    parser.add_argument("--lang", type=str, default="eng", help="Tesseract languages (default: eng)")
    parser.add_argument("--dpi", type=int, default=300, help="DPI for OCR rendering (default: 300)")
    parser.add_argument("--append", action="store_true", help="Append to output file")
    parser.add_argument("--encoding", type=str, default="utf-8", help="Encoding for output file")
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
        write_header(out, f"PDFs to Text — Consolidated Output", "=")
        out.write(f"Source folder: {folder}\n")
        out.write(f"Matched PDFs: {total_files}\n")
        out.write(f"Generated at: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")

        for fi, pdf in enumerate(pdfs, start=1):
            banner = f"[{fi}/{total_files}] {pdf.relative_to(folder)}"
            write_header(out, banner, "-")

            # Step 1: try text extraction
            text, empty_flags = extract_text_pypdf(pdf)

            if text.strip():
                out.write(text.strip() + "\n\n")
            else:
                out.write("(No extractable text found by pypdf.)\n\n")

            # Step 2 (optional): OCR only empty pages
            if args.ocr:
                try:
                    if empty_flags:
                        pages_to_ocr = [i for i, is_empty in enumerate(empty_flags) if is_empty]
                    else:
                        # If pypdf failed entirely, OCR all pages by approximating count with pdf2image
                        # We'll attempt to OCR page-by-page until no more images are produced.
                        # Safer approach: detect page count from pypdf; but if that failed, we fallback to page 0..N until break.
                        pages_to_ocr = []
                        try:
                            from pypdf import PdfReader
                            reader = PdfReader(str(pdf))
                            pages_to_ocr = list(range(len(reader.pages)))
                        except Exception:
                            pages_to_ocr = [0]  # minimal fallback

                    if pages_to_ocr:
                        ocr_texts = ocr_pdf_pages(pdf, pages_to_ocr, dpi=args.dpi, lang=args.lang)
                        if ocr_texts:
                            write_header(out, f"OCR supplement for: {pdf.name}", "~")
                            for local_idx, page_idx in enumerate(pages_to_ocr):
                                out.write(f"\n--- OCR Page {page_idx+1} ---\n")
                                out.write((ocr_texts[local_idx] or "").strip() + "\n")
                            out.write("\n")
                except Exception as e:
                    out.write(f"(OCR skipped due to error: {e})\n\n")

            out.write("\n" + "="*80 + "\n\n")

    elapsed = time.time() - start_time
    print(f"[DONE] Wrote {out_path} from {total_files} PDFs in {elapsed:.1f}s")

if __name__ == "__main__":
    main()
'''
with open('/mnt/data/pdfs_to_text.py', 'w', encoding='utf-8') as f:
    f.write(script_content)

'/mnt/data/pdfs_to_text.py'
# The script has been created and saved to the specified path.