"""
SHES – Distributed Transaction ID Generator
=============================================
Snowflake-inspired 64-bit ID generation designed for healthcare records.

Structure (64 bits total):
  [23 bits timestamp] [11 bits machine_id] [18 bits sequence] [12 bits random]

Epoch: 2024-01-01 00:00:00 UTC
Max IDs/sec per node: ~260,000
Collision probability: astronomically low due to random component

External ID: Base62 encoded, URL-safe, human-friendly
Example: internal=7284910293847, external="SHES-2Q4X7ABC"
"""
import time
import os
import random
import threading
import hashlib
import socket
import logging
from typing import Tuple

logger = logging.getLogger("apps.transaction_ids")

# ─── Constants ────────────────────────────────────────────────────────────────

# Custom epoch: 2024-01-01 00:00:00 UTC in milliseconds
SHES_EPOCH_MS = 1704067200000

# Bit lengths
TIMESTAMP_BITS  = 23
MACHINE_BITS    = 11
SEQUENCE_BITS   = 18
RANDOM_BITS     = 12

# Derived masks
MAX_MACHINE_ID  = (1 << MACHINE_BITS) - 1    # 2047
MAX_SEQUENCE    = (1 << SEQUENCE_BITS) - 1   # 262143
MAX_RANDOM      = (1 << RANDOM_BITS) - 1     # 4095

# Bit shifts
RANDOM_SHIFT    = 0
SEQUENCE_SHIFT  = RANDOM_BITS
MACHINE_SHIFT   = SEQUENCE_BITS + RANDOM_BITS
TIMESTAMP_SHIFT = MACHINE_BITS + SEQUENCE_BITS + RANDOM_BITS

# Base62 alphabet (no confusing 0/O, l/I characters)
BASE62_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz"
BASE62_BASE     = len(BASE62_ALPHABET)   # 58 (removing ambiguous chars)

# External ID prefix
EXTERNAL_PREFIX = "SHES"


class SHESTransactionIDGenerator:
    """
    Thread-safe, distributed transaction ID generator.
    Each instance represents one node in the distributed system.
    """
    _instance  = None
    _lock      = threading.Lock()

    def __init__(self, machine_id: int = None):
        self.machine_id    = self._resolve_machine_id(machine_id)
        self._sequence     = 0
        self._last_ts_ms   = -1
        self._lock         = threading.Lock()

        logger.info(
            "TransactionIDGenerator initialised. machine_id=%d",
            self.machine_id,
        )

    @classmethod
    def get_instance(cls) -> "SHESTransactionIDGenerator":
        """Singleton — one generator per process."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    machine_id     = int(os.getenv("SHES_MACHINE_ID", 0))
                    cls._instance  = cls(machine_id=machine_id or None)
        return cls._instance

    def _resolve_machine_id(self, machine_id: int = None) -> int:
        """
        Resolve machine ID from:
        1. Explicit argument
        2. SHES_MACHINE_ID environment variable
        3. Hash of hostname (deterministic per server)
        """
        if machine_id is not None:
            return machine_id & MAX_MACHINE_ID

        env_id = os.getenv("SHES_MACHINE_ID")
        if env_id:
            return int(env_id) & MAX_MACHINE_ID

        # Derive from hostname — deterministic, no coordination needed
        hostname = socket.gethostname()
        hash_val = int(hashlib.md5(hostname.encode()).hexdigest(), 16)
        return hash_val & MAX_MACHINE_ID

    def _current_ms(self) -> int:
        """Current time in milliseconds since SHES epoch."""
        return int(time.time() * 1000) - SHES_EPOCH_MS

    def _wait_for_next_ms(self, last_ms: int) -> int:
        """Busy-wait until the next millisecond — handles clock drift."""
        ts = self._current_ms()
        while ts <= last_ms:
            ts = self._current_ms()
        return ts

    def generate(self) -> Tuple[int, str]:
        """
        Generate a new transaction ID.

        Returns:
            Tuple of (internal_id: int, external_id: str)

        Thread-safe. Handles clock drift and sequence overflow.
        """
        with self._lock:
            ts_ms = self._current_ms()

            # Handle backwards clock drift (NTP adjustment, VM migration)
            if ts_ms < self._last_ts_ms:
                drift_ms = self._last_ts_ms - ts_ms
                if drift_ms <= 5:
                    # Small drift — wait for it to resolve
                    ts_ms = self._wait_for_next_ms(self._last_ts_ms)
                    logger.warning("Clock drifted back %dms — waited for resolution.", drift_ms)
                else:
                    # Large drift — raise error (system clock issue)
                    raise RuntimeError(
                        f"Clock moved backwards by {drift_ms}ms. "
                        f"Check system clock synchronisation."
                    )

            if ts_ms == self._last_ts_ms:
                # Same millisecond — increment sequence
                self._sequence = (self._sequence + 1) & MAX_SEQUENCE
                if self._sequence == 0:
                    # Sequence overflow — wait for next ms
                    ts_ms = self._wait_for_next_ms(ts_ms)
            else:
                self._sequence = 0

            self._last_ts_ms = ts_ms

            # Random component — adds unpredictability
            rand = random.getrandbits(RANDOM_BITS) & MAX_RANDOM

            # Assemble 64-bit ID
            internal_id = (
                (ts_ms        << TIMESTAMP_SHIFT) |
                (self.machine_id << MACHINE_SHIFT) |
                (self._sequence  << SEQUENCE_SHIFT) |
                rand
            )

            external_id = self._to_external(internal_id)

            return internal_id, external_id

    def decode(self, internal_id: int) -> dict:
        """Decode an internal ID back into its components."""
        rand        = (internal_id >> RANDOM_SHIFT)   & MAX_RANDOM
        sequence    = (internal_id >> SEQUENCE_SHIFT)  & MAX_SEQUENCE
        machine_id  = (internal_id >> MACHINE_SHIFT)   & MAX_MACHINE_ID
        ts_ms       = (internal_id >> TIMESTAMP_SHIFT)

        real_ts_ms  = ts_ms + SHES_EPOCH_MS
        real_ts_s   = real_ts_ms / 1000

        import datetime
        generated_at = datetime.datetime.utcfromtimestamp(real_ts_s)

        return {
            "internal_id": internal_id,
            "external_id": self._to_external(internal_id),
            "timestamp_ms":ts_ms,
            "machine_id":  machine_id,
            "sequence":    sequence,
            "random":      rand,
            "generated_at":generated_at.isoformat() + "Z",
        }

    @staticmethod
    def _to_external(internal_id: int) -> str:
        """Convert internal integer ID to Base62 external string."""
        if internal_id == 0:
            return f"{EXTERNAL_PREFIX}-{BASE62_ALPHABET[0]}"

        digits = []
        n = internal_id
        while n > 0:
            n, remainder = divmod(n, BASE62_BASE)
            digits.append(BASE62_ALPHABET[remainder])

        encoded = "".join(reversed(digits)).upper()
        return f"{EXTERNAL_PREFIX}-{encoded}"

    @staticmethod
    def _from_external(external_id: str) -> int:
        """Convert external Base62 ID back to internal integer."""
        clean = external_id.replace(f"{EXTERNAL_PREFIX}-", "")
        result = 0
        for char in clean:
            result = result * BASE62_BASE + BASE62_ALPHABET.upper().index(char)
        return result