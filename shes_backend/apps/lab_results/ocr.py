"""
SHES – Lab Report OCR Service
Extracts test names, values, and units from uploaded lab report
images or PDFs using Tesseract OCR + pattern matching.
"""
import re
import logging
import os
from typing import List, Dict

logger = logging.getLogger("apps.lab_results")

# ── Configure Tesseract path from environment ─────────────────────────────────
TESSERACT_CMD = os.getenv("TESSERACT_CMD", "")
if TESSERACT_CMD:
    try:
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
    except ImportError:
        pass


# ── Known test name aliases ────────────────────────────────────────────────────
# Maps OCR-extracted strings to canonical test names understood by the interpreter
TEST_ALIASES = {
    # Haemoglobin
    "haemoglobin": "Haemoglobin", "hemoglobin": "Haemoglobin",
    "hgb": "Haemoglobin", "hb": "Haemoglobin",

    # Blood glucose
    "fasting blood glucose": "Fasting Blood Glucose",
    "fbg": "Fasting Blood Glucose", "fbs": "Fasting Blood Glucose",
    "fasting glucose": "Fasting Blood Glucose",
    "blood glucose": "Fasting Blood Glucose",
    "glucose": "Fasting Blood Glucose",

    # HbA1c
    "hba1c": "HbA1c", "glycated haemoglobin": "HbA1c",
    "glycated hemoglobin": "HbA1c", "a1c": "HbA1c",

    # Cholesterol
    "total cholesterol": "Total Cholesterol", "cholesterol": "Total Cholesterol",
    "tc": "Total Cholesterol",
    "ldl": "LDL", "ldl cholesterol": "LDL", "low density lipoprotein": "LDL",
    "hdl": "HDL", "hdl cholesterol": "HDL", "high density lipoprotein": "HDL",

    # Creatinine / kidney
    "creatinine": "Creatinine", "serum creatinine": "Creatinine",
    "cr": "Creatinine",

    # Blood counts
    "white blood cells": "White Blood Cells", "wbc": "White Blood Cells",
    "white cell count": "White Blood Cells", "leucocytes": "White Blood Cells",
    "platelets": "Platelets", "plt": "Platelets",
    "platelet count": "Platelets",
}

# ── Regex patterns for parsing lab result lines ────────────────────────────────
# Matches lines like:
#   Haemoglobin      14.2  g/dL
#   FBG:             5.4   mmol/L
#   HbA1c .......... 7.1%
RESULT_PATTERN = re.compile(
    r"([A-Za-z][A-Za-z0-9\s\(\)/\-\.]{2,40}?)"    # test name
    r"[\s:\.·•\-]{0,8}"                             # separator
    r"([<>]?\d{1,4}(?:[.,]\d{1,3})?)"              # numeric value
    r"\s*"
    r"([%a-zA-Z/µμ]{0,12})",                       # unit (optional)
    re.IGNORECASE,
)


def extract_text_from_image(image_bytes: bytes) -> str:
    """Run Tesseract OCR on a JPEG/PNG image."""
    try:
        import pytesseract
        from PIL import Image
        import io
        image = Image.open(io.BytesIO(image_bytes))
        # Pre-process: convert to grayscale for better OCR accuracy
        image = image.convert("L")
        text = pytesseract.image_to_string(image, config="--psm 6")
        logger.info("OCR extracted %d characters from image.", len(text))
        return text
    except ImportError:
        raise ImportError("pytesseract and Pillow are required for OCR. Run: pip install pytesseract Pillow")
    except Exception as exc:
        logger.error("OCR extraction failed: %s", exc)
        raise


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from a PDF using pdfplumber."""
    try:
        import pdfplumber
        import io
        text_parts = []
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        text = "\n".join(text_parts)
        logger.info("PDF extracted %d characters from %d pages.", len(text), len(text_parts))
        return text
    except ImportError:
        raise ImportError("pdfplumber is required for PDF OCR. Run: pip install pdfplumber")
    except Exception as exc:
        logger.error("PDF extraction failed: %s", exc)
        raise


def parse_lab_results_from_text(text: str) -> List[Dict]:
    """
    Parse raw OCR text into structured lab result items.
    Returns a list of {test_name, value, unit} dicts.
    """
    results = []
    seen_tests = set()

    for line in text.splitlines():
        line = line.strip()
        if len(line) < 4:
            continue

        match = RESULT_PATTERN.search(line)
        if not match:
            continue

        raw_name = match.group(1).strip().lower()
        raw_value = match.group(2).strip().replace(",", ".")
        raw_unit = match.group(3).strip()

        # Normalise the test name using our alias table
        canonical_name = None
        for alias, canonical in TEST_ALIASES.items():
            if alias in raw_name:
                canonical_name = canonical
                break

        # If not in alias table, title-case the raw name
        if not canonical_name:
            canonical_name = raw_name.title()

        # Skip duplicates
        if canonical_name in seen_tests:
            continue
        seen_tests.add(canonical_name)

        # Clean up unit
        unit = raw_unit.replace("µ", "u").strip()

        results.append({
            "test_name": canonical_name,
            "value":     raw_value,
            "unit":      unit,
        })

    logger.info("Parsed %d lab results from OCR text.", len(results))
    return results


def process_lab_report(file_bytes: bytes, content_type: str) -> List[Dict]:
    """
    Main entry point — accepts raw file bytes and content type.
    Returns a list of parsed lab result items ready for the interpreter.
    """
    content_type = content_type.lower()

    if "pdf" in content_type:
        text = extract_text_from_pdf(file_bytes)
    elif any(t in content_type for t in ["image", "jpeg", "jpg", "png", "tiff"]):
        text = extract_text_from_image(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: {content_type}. Upload a JPEG, PNG, or PDF.")

    if not text.strip():
        raise ValueError("No text could be extracted from this file. Please ensure the image is clear and well-lit.")

    results = parse_lab_results_from_text(text)

    if not results:
        raise ValueError(
            "No recognisable lab test values were found in this report. "
            "Try uploading a clearer image or enter the values manually."
        )

    return results