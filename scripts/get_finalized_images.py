#!/usr/bin/env python3
"""Resolve Meta ad snapshot image URLs and update the finalized_ad_content worksheet."""

from __future__ import annotations

import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import gspread
import requests
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials
from gspread.exceptions import WorksheetNotFound

# --- Configuration ---------------------------------------------------------------------------
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]
SPREADSHEET_ID = "1DQbD5NSZsdHJ3ABFXSslEgbEuvLi5tZAA19cuMb9ljE"
CONTENT_WORKSHEET_TITLE = "ad_content"
OUTPUT_WORKSHEET_TITLE = "finalized_ad_content"
OUTPUT_COLUMNS: Sequence[str] = (
    "page_name",
    "ad_id",
    "publisher_platforms",
    "num_countries",
    "total_reach",
    "target_countries",
    "category",
    "ad_snapshot_url",
)
REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Cache-Control": "no-cache",
    "Referer": "https://www.facebook.com/ads/library/",
}
SNAPSHOT_TIMEOUT = 45
IMAGE_TIMEOUT = 30
DEFAULT_LOG_LEVEL = "INFO"


# --- Environment helpers --------------------------------------------------------------------

def load_environment() -> None:
    """Load environment variables from project and scripts directories."""
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


# --- Worksheet helpers ----------------------------------------------------------------------

def column_letter(index: int) -> str:
    """Convert a 1-based column index into its sheet column letter."""
    result = []
    while index:
        index, remainder = divmod(index - 1, 26)
        result.append(chr(65 + remainder))
    return "".join(reversed(result))


def ensure_column(headers: List[str], header_map: Dict[str, int], worksheet, header_name: str) -> int:
    """Ensure a column exists for header_name and return its index."""
    if header_name in header_map:
        return header_map[header_name]

    new_index = len(headers) + 1
    header_cell = f"{column_letter(new_index)}1"
    current_col_count = worksheet.col_count
    if new_index > current_col_count:
        worksheet.add_cols(new_index - current_col_count)

    worksheet.update(values=[[header_name]], range_name=header_cell)
    headers.append(header_name)
    header_map[header_name] = new_index
    logging.debug("Created new column '%s' at %s", header_name, header_cell)
    return new_index


def ensure_columns(worksheet, columns: Iterable[str]) -> List[str]:
    """Ensure the worksheet has the required columns and return the updated header list."""
    headers = worksheet.row_values(1)
    header_map = {header: idx + 1 for idx, header in enumerate(headers) if header}

    for column in columns:
        ensure_column(headers, header_map, worksheet, column)

    return headers


def reset_data_rows(worksheet) -> None:
    """Remove existing data rows while keeping the header intact."""
    if worksheet.row_count > 1:
        worksheet.resize(rows=1)


# --- Snapshot helpers -----------------------------------------------------------------------


def ensure_query_parameter(url: str, key: str, value: str) -> str:
    """Return a URL guaranteed to include the requested query parameter."""
    parsed = urlsplit(url)
    if not parsed.scheme:
        return url

    pairs = parse_qsl(parsed.query, keep_blank_values=True)
    if any(k == key for k, _ in pairs):
        return url

    pairs.append((key, value))
    new_query = urlencode(pairs, doseq=True)
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment))


def extract_original_image_url(payload: str) -> Optional[str]:
    """Pull the original_image_url field from the snapshot HTML payload."""
    match = re.search(r'"original_image_url"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', payload)
    if not match:
        return None

    raw_value = match.group(1)
    try:
        return json.loads(f'"{raw_value}"')
    except json.JSONDecodeError:
        return raw_value.replace("\\/", "/")


def fetch_snapshot_source(session: requests.Session, url: str) -> Optional[str]:
    """Fetch the snapshot HTML using regular and view-source style URLs."""
    candidates = []
    if url:
        cleaned = url.strip()
        if cleaned:
            candidates.append(cleaned)
            if not cleaned.startswith("view-source:"):
                candidates.append(f"view-source:{cleaned}")

    for candidate in candidates:
        request_url = candidate
        if candidate.startswith("view-source:"):
            request_url = candidate.replace("view-source:", "", 1)

        variant_urls: List[str] = []
        if request_url:
            with_param = ensure_query_parameter(request_url, "__a", "1")
            if with_param:
                variant_urls.append(with_param)
            if with_param != request_url:
                variant_urls.append(request_url)
            elif request_url not in variant_urls:
                variant_urls.append(request_url)

        for request_variant in variant_urls:
            try:
                response = session.get(
                    request_variant,
                    headers=REQUEST_HEADERS,
                    timeout=SNAPSHOT_TIMEOUT,
                    allow_redirects=True,
                )
            except requests.RequestException as exc:
                logging.warning("Failed to fetch snapshot for %s: %s", url, exc)
                continue

            if response.status_code >= 400:
                logging.warning(
                    "Snapshot request for %s returned status %s",
                    request_variant,
                    response.status_code,
                )
                continue

            return response.text

    return None


def resolve_image_url(session: requests.Session, url: str) -> Optional[str]:
    """Follow redirects to determine the final image URL."""
    if not url:
        return None

    try:
        head_response = session.head(url, allow_redirects=True, timeout=IMAGE_TIMEOUT)
        if head_response.ok:
            return head_response.url
    except requests.RequestException:
        pass

    try:
        get_response = session.get(url, allow_redirects=True, timeout=IMAGE_TIMEOUT, stream=True)
        get_response.close()
        if get_response.ok:
            return get_response.url
    except requests.RequestException as exc:
        logging.warning("Failed to resolve image URL %s: %s", url, exc)

    return None


# --- Main processing ------------------------------------------------------------------------

def process_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    session = requests.Session()
    output_rows: List[Dict[str, Any]] = []

    for record in records:
        ad_snapshot_url = record.get("ad_snapshot_url", "")
        resolved_url = ""

        if ad_snapshot_url:
            html_payload = fetch_snapshot_source(session, ad_snapshot_url)
            if html_payload:
                original_image_url = extract_original_image_url(html_payload)
                if original_image_url:
                    resolved = resolve_image_url(session, original_image_url)
                    resolved_url = resolved or original_image_url
                else:
                    logging.warning("original_image_url not found for ad %s", record.get("ad_id"))
            else:
                logging.warning("Unable to fetch snapshot payload for ad %s", record.get("ad_id"))

        row = dict(record)
        row["ad_snapshot_url"] = resolved_url
        output_rows.append(row)

    return output_rows


def prepare_output_sheet(spreadsheet) -> Any:
    try:
        worksheet = spreadsheet.worksheet(OUTPUT_WORKSHEET_TITLE)
    except WorksheetNotFound:
        worksheet = spreadsheet.add_worksheet(title=OUTPUT_WORKSHEET_TITLE, rows=1, cols=len(OUTPUT_COLUMNS))

    headers = worksheet.row_values(1)
    if not any(headers):
        worksheet.update(values=[list(OUTPUT_COLUMNS)], range_name="A1")
        headers = list(OUTPUT_COLUMNS)
    else:
        headers = ensure_columns(worksheet, OUTPUT_COLUMNS)

    reset_data_rows(worksheet)
    return worksheet, headers


# --- Entry point ----------------------------------------------------------------------------

def main() -> int:
    load_environment()

    log_level_name = os.getenv("GET_FINALIZED_IMAGES_LOG_LEVEL", DEFAULT_LOG_LEVEL)
    log_level = getattr(logging, str(log_level_name).upper(), logging.INFO)
    logging.basicConfig(level=log_level, format="%(asctime)s %(levelname)s %(message)s")

    credentials_path_value = os.getenv("GOOGLE_SHEETS_CREDENTIALS_PATH")
    if not credentials_path_value:
        logging.error("GOOGLE_SHEETS_CREDENTIALS_PATH is not set in the environment")
        return 1

    try:
        credentials_path = resolve_credentials_path(credentials_path_value)
    except FileNotFoundError as exc:
        logging.error(str(exc))
        return 1

    try:
        client = build_sheet_client(credentials_path)
        spreadsheet = client.open_by_key(SPREADSHEET_ID)
        content_sheet = spreadsheet.worksheet(CONTENT_WORKSHEET_TITLE)
    except Exception as exc:
        logging.error("Failed to open spreadsheet: %s", exc)
        return 1

    logging.info("Fetching records from worksheet '%s'", CONTENT_WORKSHEET_TITLE)
    records = content_sheet.get_all_records()
    if not records:
        logging.info("No records found; clearing output worksheet")
        output_sheet, _ = prepare_output_sheet(spreadsheet)
        reset_data_rows(output_sheet)
        return 0

    logging.info("Processing %d records", len(records))
    processed_rows = process_records(records)

    output_sheet, headers = prepare_output_sheet(spreadsheet)

    payload: List[List[Any]] = []
    for row in processed_rows:
        payload.append([row.get(header, "") for header in headers])

    if payload:
        output_sheet.append_rows(payload, value_input_option="RAW")
        logging.info("Wrote %d rows to worksheet '%s'", len(payload), OUTPUT_WORKSHEET_TITLE)
    else:
        logging.info("No rows to write to worksheet '%s'", OUTPUT_WORKSHEET_TITLE)

    return 0


if __name__ == "__main__":
    sys.exit(main())
