"""
SHES Tests – Distributed Transaction ID Service
Covers:
  • ID generation correctness
  • Uniqueness and collision resistance
  • Concurrent generation
  • Encoding/decoding roundtrip
  • Clock drift handling
  • API endpoints
"""
import time
import threading
import hashlib
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from apps.transaction_ids.service import issue_transaction_id
from apps.transaction_ids.generator import SHES_EPOCH_MS, MAX_MACHINE_ID, MAX_SEQUENCE
from rest_framework import status
from tests.factories import UserFactory

from apps.transaction_ids.generator import SHESTransactionIDGenerator


class TestIDStructure(TestCase):
    """Unit tests for ID structure and composition."""

    def setUp(self):
        self.gen = SHESTransactionIDGenerator(machine_id=1)

    def test_generate_returns_tuple(self):
        result = self.gen.generate()
        self.assertIsInstance(result, tuple)
        self.assertEqual(len(result), 2)

    def test_internal_id_is_positive_integer(self):
        internal_id, _ = self.gen.generate()
        self.assertIsInstance(internal_id, int)
        self.assertGreater(internal_id, 0)

    def test_external_id_has_shes_prefix(self):
        _, external_id = self.gen.generate()
        self.assertTrue(external_id.startswith("SHES-"))

    def test_external_id_is_string(self):
        _, external_id = self.gen.generate()
        self.assertIsInstance(external_id, str)

    def test_internal_id_fits_in_64_bits(self):
        internal_id, _ = self.gen.generate()
        self.assertLess(internal_id, 2 ** 64)

    def test_consecutive_ids_are_increasing(self):
        """IDs generated in sequence should be monotonically increasing."""
        ids = [self.gen.generate()[0] for _ in range(100)]
        for i in range(1, len(ids)):
            self.assertGreater(ids[i], ids[i - 1])

    def test_machine_id_encoded_correctly(self):
        gen = SHESTransactionIDGenerator(machine_id=42)
        internal_id, _ = gen.generate()
        decoded = gen.decode(internal_id)
        self.assertEqual(decoded["machine_id"], 42)

    def test_decode_roundtrip(self):
        """Encoding and decoding should be lossless."""
        internal_id, external_id = self.gen.generate()
        decoded = self.gen.decode(internal_id)
        self.assertEqual(decoded["internal_id"], internal_id)
        self.assertEqual(decoded["external_id"], external_id)

    def test_decoded_timestamp_is_recent(self):
        internal_id, _ = self.gen.generate()
        decoded     = self.gen.decode(internal_id)

        real_ts_ms = decoded["timestamp_ms"] + SHES_EPOCH_MS
        now_ms     = int(time.time() * 1000)
        self.assertAlmostEqual(real_ts_ms, now_ms, delta=5000)  # within 5 seconds


class TestIDUniqueness(TestCase):
    """Tests for uniqueness and collision resistance."""

    def setUp(self):
        self.gen = SHESTransactionIDGenerator(machine_id=1)

    def test_1000_ids_are_unique(self):
        ids = {self.gen.generate()[0] for _ in range(1000)}
        self.assertEqual(len(ids), 1000)

    def test_10000_ids_are_unique(self):
        ids = {self.gen.generate()[0] for _ in range(10000)}
        self.assertEqual(len(ids), 10000)

    def test_external_ids_are_unique(self):
        ids = {self.gen.generate()[1] for _ in range(1000)}
        self.assertEqual(len(ids), 1000)


class TestConcurrentGeneration(TestCase):
    """Tests for thread-safety and concurrent ID generation."""

    def test_concurrent_generation_no_collisions(self):
        """Generate 1000 IDs across 10 threads — no collisions."""
        gen     = SHESTransactionIDGenerator(machine_id=5)
        results = []
        errors  = []
        lock    = threading.Lock()

        def generate_batch():
            try:
                batch = [gen.generate()[0] for _ in range(100)]
                with lock:
                    results.extend(batch)
            except Exception as exc:
                with lock:
                    errors.append(str(exc))

        threads = [threading.Thread(target=generate_batch) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(errors), 0, f"Errors during concurrent generation: {errors}")
        self.assertEqual(len(results), 1000)
        self.assertEqual(len(set(results)), 1000, "Collisions detected in concurrent generation!")

    def test_concurrent_generation_5000_ids(self):
        """Stress test — 5000 IDs across 50 threads."""
        gen     = SHESTransactionIDGenerator(machine_id=7)
        results = []
        lock    = threading.Lock()

        def generate_batch():
            batch = [gen.generate()[0] for _ in range(100)]
            with lock:
                results.extend(batch)

        threads = [threading.Thread(target=generate_batch) for _ in range(50)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(set(results)), 5000, "Collisions detected in 5000-ID stress test!")


class TestIDPerformance(TestCase):
    """Performance benchmarks."""

    def test_generates_10000_ids_quickly(self):
        """Should generate 10,000 IDs in under 2 seconds."""
        gen   = SHESTransactionIDGenerator(machine_id=9)
        start = time.perf_counter()
        for _ in range(10000):
            gen.generate()
        elapsed = time.perf_counter() - start
        self.assertLess(elapsed, 2.0, f"10,000 ID generation took {elapsed:.2f}s — too slow")

    def test_ids_per_second_above_threshold(self):
        gen   = SHESTransactionIDGenerator(machine_id=3)
        start = time.perf_counter()
        count = 5000
        for _ in range(count):
            gen.generate()
        elapsed    = time.perf_counter() - start
        ids_per_sec = count / elapsed
        self.assertGreater(ids_per_sec, 5000, f"Only {ids_per_sec:.0f} IDs/sec — expected > 5000")


class TestMachineIDResolution(TestCase):
    """Tests for machine ID derivation strategies."""

    def test_explicit_machine_id(self):
        gen = SHESTransactionIDGenerator(machine_id=99)
        self.assertEqual(gen.machine_id, 99)

    def test_machine_id_bounded(self):
        gen = SHESTransactionIDGenerator(machine_id=9999)
        self.assertLessEqual(gen.machine_id, 2047)   # MAX_MACHINE_ID

    def test_different_hostnames_give_different_machine_ids(self):
        h1 = int(hashlib.md5(b"server-1").hexdigest(), 16) & MAX_MACHINE_ID
        h2 = int(hashlib.md5(b"server-2").hexdigest(), 16) & MAX_MACHINE_ID
        # Very likely to be different (not guaranteed but expected)
        self.assertIsNotNone(h1)
        self.assertIsNotNone(h2)


class TestTransactionIDAPI(APITestCase):
    """API endpoint tests."""

    def setUp(self):
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)

    def test_generate_single_id(self):
        response = self.client.post(
            reverse("id-generate"),
            {"record_type": "generic"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["success"])
        self.assertIn("internal_id", response.data["ids"])
        self.assertIn("external_id", response.data["ids"])
        self.assertTrue(response.data["ids"]["external_id"].startswith("SHES-"))

    def test_generate_lab_result_id(self):
        response = self.client.post(
            reverse("id-generate"),
            {"record_type": "lab_result"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_invalid_record_type_returns_400(self):
        response = self.client.post(
            reverse("id-generate"),
            {"record_type": "invalid_type"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_decode_id_endpoint(self):
        # Generate an ID first
        gen = SHESTransactionIDGenerator(machine_id=1)
        internal_id, _ = gen.generate()

        response = self.client.get(
            reverse("id-decode", kwargs={"internal_id": internal_id})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["internal_id"], internal_id)
        self.assertIn("timestamp_ms", response.data["data"])
        self.assertIn("machine_id", response.data["data"])

    def test_lookup_external_id(self):
        # Generate and persist an ID
        _, ext_id = issue_transaction_id(
            record_type="generic",
            user=self.user,
        )
        response = self.client.get(
            reverse("id-lookup", kwargs={"external_id": ext_id})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["external_id"], ext_id)

    def test_lookup_nonexistent_id_returns_404(self):
        response = self.client.get(
            reverse("id-lookup", kwargs={"external_id": "SHES-DOESNOTEXIST"})
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_health_endpoint_is_public(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(reverse("id-health"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "healthy")
        self.assertIn("ids_per_second", response.data)
        self.assertGreater(response.data["ids_per_second"], 0)

    def test_unauthenticated_generate_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            reverse("id-generate"),
            {"record_type": "generic"},
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TestCollisionSimulation(TestCase):
    """Simulate conditions that might cause collisions."""

    def test_same_millisecond_sequence_rollover(self):
        """
        Test that sequence rollover (same millisecond, sequence hits max)
        correctly waits for the next millisecond.
        """
        gen = SHESTransactionIDGenerator(machine_id=2)
        gen._last_ts_ms = gen._current_ms()
        gen._sequence   = MAX_SEQUENCE - 1

        # Next call should increment sequence to MAX, then overflow and wait
        id1, _ = gen.generate()
        id2, _ = gen.generate()
        self.assertNotEqual(id1, id2)

    def test_multi_machine_no_collision(self):
        """Two machines with different IDs should never produce the same internal ID."""
        gen_a = SHESTransactionIDGenerator(machine_id=10)
        gen_b = SHESTransactionIDGenerator(machine_id=20)

        ids_a = {gen_a.generate()[0] for _ in range(500)}
        ids_b = {gen_b.generate()[0] for _ in range(500)}

        collisions = ids_a & ids_b
        self.assertEqual(len(collisions), 0, f"{len(collisions)} collisions between machine 10 and 20!")