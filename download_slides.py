#!/usr/bin/env python3
"""
Slide Downloader Script
Downloads all linked files from a given webpage URL.
Particularly useful for downloading lecture slides from course websites.
"""

import os
import sys
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, unquote
import time
import re

# Configuration
DOWNLOAD_EXTENSIONS = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.zip', '.tar', '.gz']
TIMEOUT = 30  # seconds
RETRY_ATTEMPTS = 3
RETRY_DELAY = 2  # seconds


def validate_url(url):
    """
    Validate that the URL is well-formed and uses http/https.

    Args:
        url (str): The URL to validate

    Returns:
        bool: True if URL is valid, False otherwise
    """
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)

    return url_pattern.match(url) is not None


def is_downloadable_file(url):
    """
    Check if the URL points to a downloadable file based on extension.
    
    Args:
        url (str): The URL to check
        
    Returns:
        bool: True if the URL appears to be a downloadable file
    """
    parsed_url = urlparse(url.lower())
    path = unquote(parsed_url.path)
    
    # Check if the URL ends with a downloadable extension
    return any(path.endswith(ext) for ext in DOWNLOAD_EXTENSIONS)


def get_filename_from_url(url):
    """
    Extract a clean filename from a URL.
    
    Args:
        url (str): The URL to extract filename from
        
    Returns:
        str: The extracted filename
    """
    parsed_url = urlparse(url)
    path = unquote(parsed_url.path)
    filename = os.path.basename(path)
    
    # If no filename found, generate one
    if not filename or '.' not in filename:
        filename = f"download_{int(time.time())}.pdf"
    
    return filename


def sanitize_filename(filename):
    """
    Remove or replace characters that aren't safe for filenames.
    
    Args:
        filename (str): The filename to sanitize
        
    Returns:
        str: Sanitized filename
    """
    # Remove or replace problematic characters
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    
    # Limit filename length
    name, ext = os.path.splitext(filename)
    if len(name) > 200:
        name = name[:200]
    
    return name + ext


def download_file(url, output_dir, session):
    """
    Download a single file from a URL with retry logic.

    Args:
        url (str): The URL to download from
        output_dir (str): Directory to save the file
        session (requests.Session): Requests session for connection pooling

    Returns:
        bool: True if download successful, False otherwise
    """
    filename = get_filename_from_url(url)
    filename = sanitize_filename(filename)
    filepath = os.path.join(output_dir, filename)

    # Skip if file already exists
    if os.path.exists(filepath):
        file_size = os.path.getsize(filepath)
        size_str = f"{file_size / 1024:.1f} KB" if file_size < 1024 * 1024 else f"{file_size / (1024 * 1024):.1f} MB"
        print(f"  ⏭️  Skipping (already exists): {filename} ({size_str})")
        return True

    # Attempt download with retries
    for attempt in range(RETRY_ATTEMPTS):
        try:
            print(f"  ⬇️  Downloading: {filename}", end='', flush=True)

            response = session.get(url, timeout=TIMEOUT, stream=True)
            response.raise_for_status()

            # Get file size if available
            total_size = int(response.headers.get('content-length', 0))
            size_str = ""
            if total_size > 0:
                size_str = f" ({total_size / 1024:.1f} KB)" if total_size < 1024 * 1024 else f" ({total_size / (1024 * 1024):.1f} MB)"

            # Download the file with streaming
            with open(filepath, 'wb') as f:
                downloaded = 0
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        # Show progress if size is known
                        if total_size > 0:
                            progress = (downloaded / total_size) * 100
                            print(f"\r  ⬇️  Downloading: {filename}{size_str} ({progress:.1f}%)", end='', flush=True)
                print(f" ✅{size_str if total_size == 0 else ''}")

            return True

        except requests.exceptions.RequestException as e:
            print(f" ❌")
            # Clean up partial download
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except OSError:
                    pass

            if attempt < RETRY_ATTEMPTS - 1:
                print(f"  ⚠️  Retry {attempt + 1}/{RETRY_ATTEMPTS - 1} after {RETRY_DELAY}s...")
                time.sleep(RETRY_DELAY)
            else:
                print(f"  ❌ Failed to download {filename}: {str(e)}")
                return False
        except IOError as e:
            print(f" ❌")
            print(f"  ❌ File write error for {filename}: {str(e)}")
            # Clean up partial download
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except OSError:
                    pass
            return False

    return False


def is_directory_link(url, link_text):
    """
    Check if a link appears to be a directory.

    Args:
        url (str): The URL to check
        link_text (str): The text of the link

    Returns:
        bool: True if the link appears to be a directory
    """
    parsed_url = urlparse(url)
    path = parsed_url.path

    # Check if URL ends with / (common for directories)
    if path.endswith('/'):
        return True

    # Check if link text suggests a directory
    if link_text and any(indicator in link_text.lower() for indicator in ['week', 'lecture', 'folder', '[dir]']):
        return True

    # Check if URL has no file extension
    if '.' not in os.path.basename(path):
        return True

    return False


def find_downloadable_links(url, visited=None, max_depth=3, current_depth=0):
    """
    Recursively scrape a webpage and find all downloadable file links.

    Args:
        url (str): The URL of the webpage to scrape
        visited (set): Set of already visited URLs to avoid loops
        max_depth (int): Maximum recursion depth for directory traversal
        current_depth (int): Current recursion depth

    Returns:
        list: List of absolute URLs to downloadable files
    """
    if visited is None:
        visited = set()

    # Avoid infinite loops
    if url in visited or current_depth > max_depth:
        return []

    visited.add(url)

    try:
        indent = "  " * current_depth
        print(f"{indent}🔍 Scanning: {url}")

        # Fetch the webpage
        response = requests.get(url, timeout=TIMEOUT)
        response.raise_for_status()

        # Parse HTML
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find all links
        file_links = []
        directory_links = []

        for link in soup.find_all('a', href=True):
            href = link['href']
            link_text = link.get_text(strip=True)

            # Skip parent directory links
            if href in ['..', '../', './', '.']:
                continue

            # Convert relative URLs to absolute URLs
            absolute_url = urljoin(url, href)

            # Skip external links (different domain)
            if urlparse(absolute_url).netloc != urlparse(url).netloc:
                continue

            # Check if it's a downloadable file
            if is_downloadable_file(absolute_url):
                file_links.append(absolute_url)
            # Check if it's a directory to recurse into
            elif is_directory_link(absolute_url, link_text) and absolute_url not in visited:
                directory_links.append(absolute_url)

        # Remove duplicates from file links
        seen = set()
        unique_file_links = []
        for link in file_links:
            if link not in seen:
                seen.add(link)
                unique_file_links.append(link)

        if unique_file_links:
            print(f"{indent}✅ Found {len(unique_file_links)} files in this directory")

        # Recursively scan subdirectories
        all_links = unique_file_links.copy()
        if current_depth < max_depth:
            for dir_link in directory_links:
                sub_links = find_downloadable_links(dir_link, visited, max_depth, current_depth + 1)
                all_links.extend(sub_links)

        return all_links

    except requests.exceptions.RequestException as e:
        print(f"{indent}❌ Error fetching webpage: {str(e)}")
        return []


def download_slides(url, output_dir=None):
    """
    Main function to download all slides from a given URL.

    Args:
        url (str): The URL of the webpage containing slide links
        output_dir (str, optional): Directory to save files. Defaults to 'slides'
    """
    # Validate URL
    if not validate_url(url):
        print(f"❌ Error: Invalid URL format: {url}")
        print("   URL must start with http:// or https://")
        return

    # Set default output directory
    if output_dir is None:
        output_dir = 'slides'

    # Create output directory if it doesn't exist
    try:
        os.makedirs(output_dir, exist_ok=True)
        print(f"📁 Output directory: {os.path.abspath(output_dir)}")
    except PermissionError:
        print(f"❌ Error: Permission denied to create directory '{output_dir}'")
        return
    except OSError as e:
        print(f"❌ Error creating directory: {str(e)}")
        return

    # Find all downloadable links (with recursive directory traversal)
    print("\n🔍 Scanning for downloadable files (including subdirectories)...\n")
    links = find_downloadable_links(url)

    if not links:
        print("\n⚠️  No downloadable files found on this page or its subdirectories.")
        return

    print(f"\n📊 Total files found: {len(links)}")

    # Download each file
    print(f"\n📥 Starting download of {len(links)} files...\n")

    # Use a session with context manager for proper cleanup
    successful = 0
    failed = 0

    with requests.Session() as session:
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })

        for i, link in enumerate(links, 1):
            print(f"[{i}/{len(links)}]", end=' ')
            if download_file(link, output_dir, session):
                successful += 1
            else:
                failed += 1

    # Summary
    print(f"\n{'='*60}")
    print(f"📊 Download Summary:")
    print(f"  ✅ Successful: {successful}")
    print(f"  ❌ Failed: {failed}")
    print(f"  📁 Location: {os.path.abspath(output_dir)}")
    print(f"{'='*60}\n")


def check_dependencies():
    """
    Check if all required dependencies are installed.

    Returns:
        bool: True if all dependencies are available, False otherwise
    """
    missing_deps = []

    try:
        import requests
    except ImportError:
        missing_deps.append('requests')

    try:
        import bs4
    except ImportError:
        missing_deps.append('beautifulsoup4')

    if missing_deps:
        print("❌ Error: Missing required dependencies!")
        print("\nPlease install them using:")
        print(f"  pip install {' '.join(missing_deps)}")
        print("\nOr install all dependencies with:")
        print("  pip install requests beautifulsoup4")
        return False

    return True


def main():
    """
    Command-line interface for the slide downloader.
    """
    if len(sys.argv) < 2:
        print("Usage: python download_slides.py <URL> [output_directory]")
        print("\nExample:")
        print("  python download_slides.py https://example.com/lectures/slides/")
        print("  python download_slides.py https://example.com/lectures/slides/ ./my_slides")
        sys.exit(1)

    # Check dependencies
    if not check_dependencies():
        sys.exit(1)

    url = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'slides'

    print("=" * 60)
    print("📚 Slide Downloader")
    print("=" * 60)

    try:
        download_slides(url, output_dir)
    except KeyboardInterrupt:
        print("\n\n⚠️  Download interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()