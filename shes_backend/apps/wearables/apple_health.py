"""
SHES – Apple Health CSV Import
Since Apple HealthKit has no public web API, users export their data
as a ZIP file from the Health app and upload it to SHES.

Export steps:
  iPhone → Health app → Profile photo → Export All Health Data
  → Share the export.zip with yourself → Upload to SHES
"""
import logging
import zipfile
import io
import xml.etree.ElementTree as ET
from datetime import datetime

logger = logging.getLogger("apps.wearables")

# Apple Health record type → SHES metric mapping
APPLE_TYPE_MAP = {
    "HKQuantityTypeIdentifierStepCount":              "steps",
    "HKQuantityTypeIdentifierHeartRate":              "heart_rate",
    "HKCategoryTypeIdentifierSleepAnalysis":          "sleep_hours",
    "HKQuantityTypeIdentifierActiveEnergyBurned":     "calories",
    "HKQuantityTypeIdentifierBodyMass":               "weight",
    "HKQuantityTypeIdentifierOxygenSaturation":       "oxygen_sat",
    "HKQuantityTypeIdentifierBloodGlucose":           "glucose",
    "HKQuantityTypeIdentifierBodyTemperature":        "temperature",
    "HKQuantityTypeIdentifierDistanceWalkingRunning": "distance",
}

APPLE_UNIT_MAP = {
    "steps":       "steps",
    "heart_rate":  "bpm",
    "sleep_hours": "hrs",
    "calories":    "kcal",
    "weight":      "kg",
    "oxygen_sat":  "%",
    "glucose":     "mg/dL",
    "temperature": "°C",
    "distance":    "km",
}


def parse_apple_health_export(zip_bytes: bytes, patient, max_records: int = 1000) -> int:
    """
    Parse Apple Health export ZIP and save readings to the database.

    Args:
        zip_bytes:   Raw bytes of the export.zip from iPhone Health app
        patient:     The User who owns this data
        max_records: Safety limit on records to import per upload

    Returns:
        Number of records saved
    """
    from .models import WearableReading

    try:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            # Apple Health export always contains apple_health_export/export.xml
            xml_name = next(
                (n for n in zf.namelist() if n.endswith("export.xml")),
                None,
            )
            if not xml_name:
                raise ValueError("No export.xml found in the uploaded ZIP file.")

            with zf.open(xml_name) as f:
                tree = ET.parse(f)
                root = tree.getroot()

    except zipfile.BadZipFile:
        raise ValueError("The uploaded file is not a valid ZIP archive.")

    saved   = 0
    skipped = 0

    for record in root.iter("Record"):
        if saved >= max_records:
            break

        record_type = record.get("type", "")
        metric      = APPLE_TYPE_MAP.get(record_type)
        if not metric:
            skipped += 1
            continue

        try:
            raw_value   = float(record.get("value", 0))
            start_date  = record.get("startDate", "")
            recorded_at = datetime.strptime(start_date, "%Y-%m-%d %H:%M:%S %z")

            # Sleep is stored as 0/1 category values — convert to hours
            if metric == "sleep_hours":
                # Only count "Asleep" category (value = 0)
                if record.get("value") != "HKCategoryValueSleepAnalysisAsleep":
                    continue
                end_date   = record.get("endDate", "")
                end_dt     = datetime.strptime(end_date, "%Y-%m-%d %H:%M:%S %z")
                duration_h = (end_dt - recorded_at).total_seconds() / 3600
                raw_value  = round(duration_h, 1)

            # Oxygen saturation is stored as 0-1 fraction
            if metric == "oxygen_sat":
                raw_value = round(raw_value * 100, 1)

            # Distance: Apple stores in metres → convert to km
            if metric == "distance":
                raw_value = round(raw_value / 1000, 2)

            WearableReading.objects.get_or_create(
                patient     = patient,
                metric      = metric,
                recorded_at = recorded_at,
                defaults={
                    "value":  round(raw_value, 2),
                    "unit":   APPLE_UNIT_MAP.get(metric, ""),
                    "source": "apple_health",
                },
            )
            saved += 1

        except (ValueError, KeyError) as exc:
            logger.debug("Skipped Apple Health record: %s", exc)
            skipped += 1

    logger.info(
        "Apple Health import: %d saved, %d skipped for %s",
        saved, skipped, patient.email
    )
    return saved