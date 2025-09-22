#!/usr/bin/env python3
"""Identify top Meta ads per brand and write summary metrics to the ad_content worksheet."""

from __future__ import annotations

import json
import logging
import os
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

import gspread
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

# --- Configuration ---------------------------------------------------------------------------
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]
SPREADSHEET_ID = "1DQbD5NSZsdHJ3ABFXSslEgbEuvLi5tZAA19cuMb9ljE"
ADS_WORKSHEET_TITLE = "ads"
CONTENT_WORKSHEET_TITLE = "ad_content"
TOP_ADS_PER_BRAND = 2
DEFAULT_LOG_LEVEL = "INFO"
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


# --- Parsing helpers ------------------------------------------------------------------------

def parse_jsonish(value: Any) -> Any:
    """Attempt to parse a value that may contain JSON or newline-separated JSON payloads."""
    if value is None:
        return None
    if isinstance(value, (list, dict)):
        return value
    if isinstance(value, (int, float)):
        return value

    text = str(value).strip()
    if not text:
        return None

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        items: List[Any] = []
        for line in text.splitlines():
            candidate = line.strip().strip(",")
            if not candidate:
                continue
            try:
                items.append(json.loads(candidate))
                continue
            except json.JSONDecodeError:
                pass

            if ":" in candidate and not candidate.startswith("{") and not candidate.startswith("["):
                key, raw_value = candidate.split(":", 1)
                key = key.strip()
                raw_value = raw_value.strip()
                numeric = _maybe_float(raw_value)
                items.append({key: numeric if numeric is not None else raw_value})
                continue

            numeric = _maybe_float(candidate)
            if numeric is not None:
                items.append(numeric)
            else:
                items.append(candidate)

        if not items:
            return text
        if len(items) == 1:
            return items[0]
        return items


def _maybe_float(value: Any) -> Optional[float]:
    try:
        if isinstance(value, bool):
            return None
        if isinstance(value, str):
            cleaned = value.replace(",", "").strip()
            if not cleaned:
                return None
            return float(cleaned)
        if isinstance(value, (int, float)):
            return float(value)
    except ValueError:
        return None
    return None


def parse_platforms(value: Any) -> List[str]:
    parsed = parse_jsonish(value)
    platforms: List[str] = []

    if isinstance(parsed, list):
        for item in parsed:
            if isinstance(item, str):
                cleaned = item.strip()
                if cleaned:
                    platforms.append(cleaned)
            elif isinstance(item, dict):
                for key in ("name", "platform", "value"):
                    if key in item:
                        candidate = str(item[key]).strip()
                        if candidate:
                            platforms.append(candidate)
                        break
            elif item is not None:
                platforms.append(str(item).strip())
    elif isinstance(parsed, str):
        cleaned = parsed.strip()
        if cleaned:
            platforms.extend([part.strip() for part in cleaned.split(",") if part.strip()])
    elif parsed is not None:
        platforms.append(str(parsed).strip())

    if not platforms and isinstance(value, str):
        platforms.extend([part.strip() for part in value.splitlines() if part.strip()])

    # Remove duplicates while preserving order
    seen = set()
    unique_platforms: List[str] = []
    for platform in platforms:
        if platform.lower() in seen:
            continue
        seen.add(platform.lower())
        unique_platforms.append(platform)

    return unique_platforms


def _is_truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        lowered = value.strip().lower()
        return lowered in {"true", "1", "yes"}
    return False


def extract_countries(value: Any) -> List[str]:
    parsed = parse_jsonish(value)
    countries: List[str] = []

    def add_country(candidate: Any) -> None:
        if candidate is None:
            return
        country = str(candidate).strip()
        if not country:
            return
        lowered = country.lower()
        if lowered in {"excluded", "num_obfuscated", "countries", "type"}:
            return
        countries.append(country)

    def handle_item(item: Any) -> None:
        if isinstance(item, dict):
            if _is_truthy(item.get("excluded")):
                return
            type_hint = item.get("type")
            if type_hint:
                type_text = str(type_hint).lower()
                if not any(token in type_text for token in ("country", "countries")):
                    return
            for key in ("name", "country", "country_name"):
                if key in item:
                    add_country(item[key])
                    return
            for key in ("country_code", "key"):
                if key in item:
                    add_country(item[key])
                    return
        elif isinstance(item, (list, tuple, set)):
            for sub in item:
                handle_item(sub)
        else:
            add_country(item)

    if isinstance(parsed, list):
        for item in parsed:
            handle_item(item)
    elif isinstance(parsed, dict):
        handle_item(parsed)
    elif parsed is not None:
        handle_item(parsed)

    if not countries and isinstance(value, str):
        for token in value.replace(",", "\n").splitlines():
            add_country(token)

    seen = set()
    unique_countries: List[str] = []
    for country in countries:
        lowered = country.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        unique_countries.append(country)

    return unique_countries


def compute_total_reach(value: Any) -> int:
    parsed = parse_jsonish(value)

    def accumulate(item: Any) -> float:
        if isinstance(item, dict):
            if "value" in item:
                numeric = _maybe_float(item["value"])
                return numeric or 0.0
            subtotal = 0.0
            for key in ("total_reach", "reach", "reach_estimate"):
                if key in item:
                    numeric = _maybe_float(item[key])
                    if numeric is not None:
                        subtotal += numeric
            if subtotal:
                return subtotal
            return sum(accumulate(val) for val in item.values())
        if isinstance(item, (list, tuple, set)):
            return sum(accumulate(elem) for elem in item)
        numeric = _maybe_float(item)
        return numeric or 0.0

    total = accumulate(parsed)
    return int(round(total))


def sanitize_text(value: Any) -> str:
    return str(value).strip() if value is not None else ""


# --- Core processing ------------------------------------------------------------------------

def select_top_ads(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    grouped: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    for record in records:
        page_name = sanitize_text(record.get("page_name"))
        if not page_name:
            continue

        total_reach = compute_total_reach(record.get("total_reach_by_location"))
        countries = extract_countries(record.get("target_locations"))
        num_countries = len(countries)
        platforms = parse_platforms(record.get("publisher_platforms"))
        ad_id = sanitize_text(record.get("id"))
        snapshot_url = sanitize_text(record.get("ad_snapshot_url"))
        delivery_start = sanitize_text(record.get("ad_delivery_start_time"))
        creation_time = sanitize_text(record.get("ad_creation_time"))
        category_value = sanitize_text(record.get("category") or record.get("Category"))

        grouped[page_name].append(
            {
                "page_name": page_name,
                "ad_id": ad_id,
                "publisher_platforms": ", ".join(platforms),
                "num_countries": num_countries,
                "total_reach": total_reach,
                "target_countries": ", ".join(countries),
                "category": category_value,
                "ad_snapshot_url": snapshot_url,
                "_delivery_start": delivery_start,
                "_creation_time": creation_time,
            }
        )

    selected_rows: List[Dict[str, Any]] = []
    for page_name, ads in grouped.items():
        ads.sort(
            key=lambda item: (
                item["total_reach"],
                item["num_countries"]
            ),
            reverse=True,
        )
        top_ads = ads[:TOP_ADS_PER_BRAND]
        selected_rows.extend(top_ads)
        logging.debug("Selected %d ads for %s", len(top_ads), page_name)

    selected_rows.sort(
        key=lambda item: (
            item["page_name"].lower(),
            -item["total_reach"],
            -item["num_countries"],
            item["ad_id"],
        )
    )

    return selected_rows


# --- Main -----------------------------------------------------------------------------------

def main() -> int:
    load_environment()

    log_level_name = os.getenv("GET_AD_IMAGES_LOG_LEVEL", DEFAULT_LOG_LEVEL)
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
        ads_sheet = spreadsheet.worksheet(ADS_WORKSHEET_TITLE)
        content_sheet = spreadsheet.worksheet(CONTENT_WORKSHEET_TITLE)
    except Exception as exc:
        logging.error("Failed to open spreadsheet: %s", exc)
        return 1

    logging.info("Fetching ads data from worksheet '%s'", ADS_WORKSHEET_TITLE)
    records = ads_sheet.get_all_records()
    if not records:
        logging.info("No records found in worksheet '%s'", ADS_WORKSHEET_TITLE)
        reset_data_rows(content_sheet)
        return 0

    logging.info("Processing %d ads", len(records))
    selected_ads = select_top_ads(records)
    logging.info("Writing %d rows to worksheet '%s'", len(selected_ads), CONTENT_WORKSHEET_TITLE)

    headers = content_sheet.row_values(1)
    if not any(headers):
        content_sheet.update(values=[list(OUTPUT_COLUMNS)], range_name="A1")
        headers = list(OUTPUT_COLUMNS)
    else:
        headers = ensure_columns(content_sheet, OUTPUT_COLUMNS)

    reset_data_rows(content_sheet)

    if not selected_ads:
        logging.info("No ads qualified for output")
        return 0

    row_payload = []
    for item in selected_ads:
        row_dict = {key: item.get(key, "") for key in OUTPUT_COLUMNS}
        row_payload.append([row_dict.get(header, "") for header in headers])

    content_sheet.append_rows(row_payload, value_input_option="RAW")
    logging.info("Completed update for worksheet '%s'", CONTENT_WORKSHEET_TITLE)
    return 0


if __name__ == "__main__":
    sys.exit(main())
