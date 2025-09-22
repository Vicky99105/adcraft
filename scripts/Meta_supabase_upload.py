#!/usr/bin/env python3
"""Upload Meta ad snapshots from the ad_content worksheet to the Supabase templates table."""

from __future__ import annotations

import argparse
import html
import logging
import os
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import gspread
import requests
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials
from supabase import Client, create_client

# --- Configuration ---------------------------------------------------------------------------
SCOPES = (
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
)
SPREADSHEET_ID = "1DQbD5NSZsdHJ3ABFXSslEgbEuvLi5tZAA19cuMb9ljE"
WORKSHEET_TITLE = "finalized_ad_content"
SUPABASE_BUCKET = "templates"
DEFAULT_LOG_LEVEL = "INFO"
DEFAULT_START_ROW = 2
OUTPUT_COLUMNS: Sequence[str] = (
    "Brand",
    "id",
    "publisher_platforms",
    "num_countries",
    "total_reach",
    "target_countries",
    "ad_snapshot_url",
    "a",
    "page_name",
    "ad_id",
    "category",
)


# --- Data models -----------------------------------------------------------------------------
@dataclass
class SheetRow:
    sheet_index: int
    raw: Dict[str, Any]

    @property
    def brand(self) -> str:
        return sanitize_text(self.raw.get("page_name") or self.raw.get("Brand"))

    @property
    def ad_id(self) -> str:
        ad_identifier = sanitize_text(self.raw.get("ad_id")) or sanitize_text(self.raw.get("id"))
        return ad_identifier

    @property
    def category(self) -> str:
        return sanitize_text(self.raw.get("category"))

    @property
    def snapshot_url(self) -> str:
        return sanitize_url(self.raw.get("ad_snapshot_url")) or sanitize_url(self.raw.get("a"))

    @property
    def page_name(self) -> str:
        return sanitize_text(self.raw.get("page_name"))

    @property
    def publisher_platforms(self) -> str:
        return sanitize_text(self.raw.get("publisher_platforms"))

    @property
    def target_countries(self) -> str:
        return sanitize_text(self.raw.get("target_countries"))

    @property
    def n_countries(self) -> Optional[int]:
        return parse_integer(self.raw.get("num_countries"))

    @property
    def reach(self) -> Optional[int]:
        return parse_integer(self.raw.get("total_reach"))


# --- Environment helpers --------------------------------------------------------------------
def load_environment() -> None:
    """Load environment variables from the project and scripts directories."""
    load_dotenv()
    scripts_env = Path(__file__).resolve().parent / ".env"
    if scripts_env.exists():
        load_dotenv(scripts_env, override=False)


def resolve_credentials_path(raw_path: str) -> Path:
    """Return an absolute path to the Google credentials file."""
    candidate = Path(raw_path).expanduser()
    if candidate.exists():
        return candidate

    scripts_candidate = Path(__file__).resolve().parent / raw_path
    if scripts_candidate.exists():
        return scripts_candidate

    raise FileNotFoundError(
        "Unable to locate Google credentials file at "
        f"'{raw_path}'. Checked current working directory and scripts directory."
    )


def build_sheet_client(credentials_path: Path) -> gspread.Client:
    creds = Credentials.from_service_account_file(str(credentials_path), scopes=SCOPES)
    return gspread.authorize(creds)


def build_supabase_client() -> Client:
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in the environment")

    return create_client(supabase_url, supabase_key)


# --- Utility functions ----------------------------------------------------------------------
def sanitize_text(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def sanitize_url(value: Any) -> str:
    if value is None:
        return ""
    text = html.unescape(str(value).strip())
    return text


def parse_integer(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip().replace(",", "")
    if not text:
        return None
    try:
        return int(float(text))
    except ValueError:
        return None


def ensure_columns(worksheet: gspread.Worksheet, columns: Iterable[str]) -> None:
    headers = worksheet.row_values(1)
    header_map = {header: idx + 1 for idx, header in enumerate(headers) if header}
    for column in columns:
        if column in header_map:
            continue
        new_index = len(headers) + 1
        worksheet.update(range_name=f"{column_letter(new_index)}1", values=[[column]])
        headers.append(column)
        header_map[column] = new_index


def column_letter(index: int) -> str:
    letters: List[str] = []
    while index:
        index, remainder = divmod(index - 1, 26)
        letters.append(chr(65 + remainder))
    return "".join(reversed(letters))


def fetch_rows(
    worksheet: gspread.Worksheet,
    start_row: int,
    max_rows: Optional[int],
) -> List[SheetRow]:
    records = worksheet.get_all_records()
    start_index = max(start_row, 2) - 2

    if max_rows is None:
        selected = records[start_index:]
    else:
        selected = records[start_index : start_index + max_rows]

    rows: List[SheetRow] = []
    for offset, record in enumerate(selected):
        sheet_index = start_index + offset + 2
        rows.append(SheetRow(sheet_index=sheet_index, raw=record))

    return rows


def generate_filename(row: SheetRow, extension: str) -> str:
    brand_part = row.brand or "unknown"
    category_part = row.category or "uncategorized"
    ad_part = row.ad_id or str(uuid.uuid4())

    brand_part = brand_part.replace(" ", "_").replace("/", "_")[:40]
    category_part = category_part.replace(" ", "_").replace("/", "_")[:40]
    ad_part = ad_part.replace(" ", "_").replace("/", "_")[:40]

    unique_suffix = uuid.uuid4().hex[:8]
    safe_extension = extension if extension.startswith(".") else f".{extension}" if extension else ".jpg"

    filename = f"{brand_part}_{category_part}_{ad_part}_{unique_suffix}{safe_extension}"
    return filename


def detect_extension_from_url(url: str) -> str:
    from urllib.parse import urlparse

    parsed = urlparse(url)
    suffix = Path(parsed.path).suffix
    if suffix:
        return suffix
    return ".jpg"


def download_snapshot(url: str, timeout: int = 30) -> bytes:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; MetaTemplateUploader/1.0)",
    }
    response = requests.get(url, headers=headers, timeout=timeout)
    response.raise_for_status()
    return response.content


def upload_to_bucket(
    supabase: Client,
    bucket: str,
    filename: str,
    content: bytes,
    content_type: str,
) -> str:
    storage = supabase.storage.from_(bucket)
    storage.upload(filename, content, file_options={"content-type": content_type})
    public_url = storage.get_public_url(filename)
    return public_url


def insert_template_record(
    supabase: Client,
    *,
    url: str,
    filename: str,
    row: SheetRow,
) -> str:
    data = {
        "url": url,
        "file_name": filename,
        "prompt": generate_prompt(row),
        "is_visible": False,
        "src": "meta",
        "category": row.category or None,
        "brand": row.brand or None,
        "n_countries": row.n_countries,
        "reach": row.reach,
    }
    result = supabase.table("templates").insert(data).execute()
    if not result.data:
        raise RuntimeError("Supabase insert returned no data")
    return result.data[0]["id"]


def generate_prompt(row: SheetRow) -> str:
    parts = [
        f"Meta ad for {row.brand}" if row.brand else "Meta ad",
        f"Category: {row.category}" if row.category else None,
        f"Page: {row.page_name}" if row.page_name else None,
        f"Ad ID: {row.ad_id}" if row.ad_id else None,
        f"Platforms: {row.publisher_platforms}" if row.publisher_platforms else None,
    ]
    cleaned = [part for part in parts if part]
    return " - ".join(cleaned)


# --- Core processing ------------------------------------------------------------------------
def process_rows(
    supabase: Client,
    rows: List[SheetRow],
    *,
    bucket: str,
) -> Tuple[int, int]:
    success = 0
    failures = 0

    for index, row in enumerate(rows, 1):
        logging.info(
            "[%d/%d] Processing sheet row %d (ad_id=%s, brand=%s)",
            index,
            len(rows),
            row.sheet_index,
            row.ad_id or "n/a",
            row.brand or "n/a",
        )

        if not row.snapshot_url:
            logging.warning(
                "[%d/%d] Missing snapshot URL in row %d; skipping",
                index,
                len(rows),
                row.sheet_index,
            )
            failures += 1
            continue

        try:
            logging.debug("[%d/%d] Downloading snapshot %s", index, len(rows), row.snapshot_url)
            image_bytes = download_snapshot(row.snapshot_url)
            extension = detect_extension_from_url(row.snapshot_url)
            content_type = "image/png" if extension.lower() == ".png" else "image/jpeg"
            filename = generate_filename(row, extension)

            logging.debug("[%d/%d] Uploading %s to Supabase bucket %s", index, len(rows), filename, bucket)
            public_url = upload_to_bucket(supabase, bucket, filename, image_bytes, content_type)

            logging.debug("[%d/%d] Creating template record for %s", index, len(rows), filename)
            template_id = insert_template_record(supabase, url=public_url, filename=filename, row=row)

            logging.info(
                "[%d/%d] ✅ Uploaded template %s (template_id=%s)",
                index,
                len(rows),
                filename,
                template_id,
            )
            success += 1

        except requests.HTTPError as err:
            logging.error(
                "[%d/%d] Failed to download %s: %s", index, len(rows), row.snapshot_url, err
            )
            failures += 1
        except Exception as err:
            logging.error(
                "[%d/%d] Unexpected error for row %d: %s",
                index,
                len(rows),
                row.sheet_index,
                err,
            )
            failures += 1

    return success, failures


# --- CLI ------------------------------------------------------------------------------------
def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--start-row",
        type=int,
        default=DEFAULT_START_ROW,
        help="First worksheet row (1-based) to process; defaults to the first data row.",
    )
    parser.add_argument(
        "--max-rows",
        type=int,
        default=None,
        help="Maximum number of rows to process. Omit to process all rows after start-row.",
    )
    parser.add_argument(
        "--log-level",
        type=str,
        default=os.getenv("META_TEMPLATE_UPLOAD_LOG_LEVEL", DEFAULT_LOG_LEVEL),
        help="Logging level (DEBUG, INFO, WARNING, ERROR).",
    )
    return parser.parse_args(argv)


def configure_logging(level_name: str) -> None:
    level = getattr(logging, level_name.upper(), logging.INFO)
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(message)s")


# --- Main -----------------------------------------------------------------------------------
def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)
    configure_logging(args.log_level)

    load_environment()

    credentials_path_value = os.getenv("GOOGLE_SHEETS_CREDENTIALS_PATH")
    if not credentials_path_value:
        logging.error("GOOGLE_SHEETS_CREDENTIALS_PATH is not set in the environment")
        return 1

    try:
        credentials_path = resolve_credentials_path(credentials_path_value)
    except FileNotFoundError as exc:
        logging.error(str(exc))
        return 1

    logging.info("Connecting to Google Sheets → %s / %s", SPREADSHEET_ID, WORKSHEET_TITLE)
    sheet_client = build_sheet_client(credentials_path)
    worksheet = sheet_client.open_by_key(SPREADSHEET_ID).worksheet(WORKSHEET_TITLE)

    ensure_columns(worksheet, OUTPUT_COLUMNS)

    rows = fetch_rows(worksheet, args.start_row, args.max_rows)
    if not rows:
        logging.warning("No rows selected for processing (start_row=%d, max_rows=%s)", args.start_row, args.max_rows)
        return 0

    logging.info("Selected %d rows starting at sheet row %d", len(rows), rows[0].sheet_index)

    supabase = build_supabase_client()
    success, failures = process_rows(supabase, rows, bucket=SUPABASE_BUCKET)

    logging.info(
        "Finished processing: %d succeeded, %d failed (start_row=%d, max_rows=%s)",
        success,
        failures,
        args.start_row,
        args.max_rows if args.max_rows is not None else "all",
    )

    return 0 if failures == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
