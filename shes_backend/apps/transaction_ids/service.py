"""
SHES Transaction ID Service
============================
High-level service used by all SHES modules to issue transaction IDs.
"""
import logging
from .models import TransactionRecord
from typing import Tuple, Optional
from .generator import SHESTransactionIDGenerator

logger = logging.getLogger("apps.transaction_ids")


def issue_transaction_id(
    record_type: str = "generic",
    user=None,
    reference_id: str = "",
    persist: bool = True,
) -> Tuple[int, str]:
    """
    Issue a new transaction ID and optionally persist it.

    Args:
        record_type:  One of TransactionRecord.RecordType choices
        user:         The user this transaction belongs to (optional)
        reference_id: UUID of the related SHES record (optional)
        persist:      Whether to save the record to the database

    Returns:
        Tuple of (internal_id: int, external_id: str)
    """
    generator   = SHESTransactionIDGenerator.get_instance()
    internal_id, external_id = generator.generate()

    if persist:
        try:
            TransactionRecord.objects.create(
                internal_id  = internal_id,
                external_id  = external_id,
                record_type  = record_type,
                issued_to    = user,
                reference_id = str(reference_id) if reference_id else "",
                machine_id   = generator.machine_id,
            )
        except Exception as exc:
            # Never let transaction ID persistence block the main flow
            logger.error("Failed to persist transaction record: %s", exc)

    logger.debug(
        "Transaction ID issued: internal=%d external=%s type=%s",
        internal_id, external_id, record_type,
    )
    return internal_id, external_id


def decode_transaction_id(internal_id: int) -> dict:
    """Decode an internal ID back into its components."""
    generator = SHESTransactionIDGenerator.get_instance()
    return generator.decode(internal_id)


def lookup_by_external(external_id: str) -> Optional[dict]:
    """Look up a transaction record by its external ID."""
    try:
        record = TransactionRecord.objects.select_related("issued_to").get(
            external_id=external_id
        )
        return {
            "internal_id":  record.internal_id,
            "external_id":  record.external_id,
            "record_type":  record.record_type,
            "issued_to":    record.issued_to.email if record.issued_to else None,
            "reference_id": record.reference_id,
            "created_at":   record.created_at.isoformat(),
        }
    except TransactionRecord.DoesNotExist:
        return None