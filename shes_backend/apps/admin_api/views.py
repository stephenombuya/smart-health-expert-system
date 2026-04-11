"""
SHES Admin API Views
"""

from django.contrib.auth import get_user_model
from django.db.models import Count, Avg, Q
from django.utils import timezone
from datetime import timedelta
import os
from django.conf import settings

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from apps.authentication.models import PatientProfile
from apps.triage.models import TriageSession, Symptom
from apps.medications.models import Medication, PatientMedication, DrugInteraction
from apps.chronic_tracking.models import GlucoseReading, BloodPressureReading
from apps.mental_health.models import MoodEntry, CopingStrategy
from apps.lab_results.models import LabResult

User = get_user_model()


# ── Permissions ───────────────────────────────────────────────────────────────

class IsAdminRole(IsAuthenticated):
    """Allows access only to users with role='admin'."""
    def has_permission(self, request, view):
        return (
            super().has_permission(request, view)
            and getattr(request.user, "role", None) == "admin"
        )


# ── Pagination ────────────────────────────────────────────────────────────────

class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


# ── Helpers ───────────────────────────────────────────────────────────────────

def ok(data, code=200):
    return Response({"success": True, "data": data}, status=code)

def err(detail, code=400):
    return Response({"success": False, "error": {"code": code, "detail": detail}}, status=code)


# ═════════════════════════════════════════════════════════════════════════════
# 1. OVERVIEW
# ═════════════════════════════════════════════════════════════════════════════

class AdminOverviewView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        now     = timezone.now()
        last_7  = now - timedelta(days=7)
        last_30 = now - timedelta(days=30)

        kpis = {
            "total_users":   User.objects.count(),
            "new_this_week": User.objects.filter(created_at__gte=last_7).count(),
            "active_users":  User.objects.filter(last_login__gte=last_30).count(),
            "triage_total":  TriageSession.objects.count(),
            "triage_week":   TriageSession.objects.filter(created_at__gte=last_7).count(),
            "emergencies":   TriageSession.objects.filter(urgency_level="emergency").count(),
            "doctor_visits": TriageSession.objects.filter(urgency_level="doctor_visit").count(),
            "avg_mood_14d":  round(v, 1) if (v := MoodEntry.objects.filter(
                recorded_at__gte=now - timedelta(days=14)
            ).aggregate(a=Avg("mood_score"))["a"]) else None,
        }

        user_trend = []
        for i in range(13, -1, -1):
            day = now - timedelta(days=i)
            user_trend.append({
                "date":  day.strftime("%b %d"),
                "count": User.objects.filter(created_at__date=day.date()).count(),
            })

        urgency_dist = list(
            TriageSession.objects
            .values("urgency_level")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        role_dist = list(
            User.objects.values("role").annotate(count=Count("id"))
        )

        return ok({
            "kpis":        kpis,
            "user_trend":  user_trend,
            "urgency_dist": urgency_dist,
            "role_dist":   role_dist,
        })


# ═════════════════════════════════════════════════════════════════════════════
# 2. USERS
# ═════════════════════════════════════════════════════════════════════════════

class AdminUserListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = User.objects.all().order_by("-created_at")
        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )
        role = request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        is_active = request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=(is_active.lower() == "true"))

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)

        if page is None:
            return ok({"data": [], "message": "No data"})

        data = [_serialize_user(u) for u in page if u]

        return paginator.get_paginated_response({"success": True, "data": data})

    def post(self, request):
        d = request.data
        required = ["email", "password", "first_name", "last_name", "role"]
        missing = [f for f in required if not d.get(f)]
        if missing:
            return err(f"Missing fields: {', '.join(missing)}")
        if User.objects.filter(email=d["email"]).exists():
            return err("A user with this email already exists.")
        user = User.objects.create_user(
            email=d["email"], password=d["password"],
            first_name=d["first_name"], last_name=d["last_name"],
            role=d["role"],
        )
        return ok({"id": str(user.id), "email": user.email}, 201)


def _serialize_user(u):
    return {
        "id": str(u.id),
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "role": u.role,
        "is_active": u.is_active,
        "date_joined": u.created_at.isoformat() if u.created_at else None,
        "last_login": u.last_login.isoformat() if u.last_login else None,
        "county": getattr(u, "county", None),
    }



class AdminUserDetailView(APIView):
    permission_classes = [IsAdminRole]

    def _get(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self._get(pk)
        if not user:
            return err("User not found.", 404)
        data = _serialize_user(user)
        try:
            p = user.patientprofile
            data["patient_profile"] = {
                "blood_group":             p.blood_group,
                "known_allergies":         p.known_allergies,
                "chronic_conditions":      p.chronic_conditions,
                "emergency_contact_name":  p.emergency_contact_name,
                "emergency_contact_phone": p.emergency_contact_phone,
            }
        except Exception:
            data["patient_profile"] = None
        data["stats"] = {
            "triage_sessions":    TriageSession.objects.filter(patient=user).count(),
            "active_medications": PatientMedication.objects.filter(patient=user, is_active=True).count(),
        }
        return ok(data)

    def patch(self, request, pk):
        user = self._get(pk)
        if not user:
            return err("User not found.", 404)
        for field in ["first_name", "last_name", "role", "is_active", "county", "phone_number"]:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()
        return ok({"message": "User updated."})

    def delete(self, request, pk):
        user = self._get(pk)
        if not user:
            return err("User not found.", 404)
        if user == request.user:
            return err("You cannot deactivate your own account.")
        user.is_active = False
        user.save()
        return ok({"message": "User deactivated."})


class AdminUserReactivateView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return err("User not found.", 404)
        user.is_active = True
        user.save()
        return ok({"message": "User reactivated."})


# ═════════════════════════════════════════════════════════════════════════════
# 3. TRIAGE
# ═════════════════════════════════════════════════════════════════════════════

class AdminTriageListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = TriageSession.objects.select_related("patient").order_by("-created_at")
        urgency = request.query_params.get("urgency")
        if urgency:
            qs = qs.filter(urgency_level=urgency)
        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(patient__email__icontains=search)
                | Q(patient__first_name__icontains=search)
                | Q(patient__last_name__icontains=search)
            )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        data = [
            {
                "id":              str(s.id),
                "patient_email":   s.patient.email,
                "patient_name":    f"{s.patient.first_name} {s.patient.last_name}",
                "urgency_level":   s.urgency_level,
                "completed":       s.completed,
                "created_at":      s.created_at.isoformat(),
                "red_flags_count": len(s.red_flags_detected or []),
                "conditions_count": len(s.matched_conditions or []),
            }
            for s in page
        ]
        return paginator.get_paginated_response({"success": True, "data": data})


# ═════════════════════════════════════════════════════════════════════════════
# 4. MEDICATIONS
# ═════════════════════════════════════════════════════════════════════════════

class AdminMedicationListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = Medication.objects.all().order_by("name")
        search = request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(generic_name__icontains=search))
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        data = [_serialize_med(m) for m in page]
        return paginator.get_paginated_response({"success": True, "data": data})

    def post(self, request):
        d = request.data
        missing = [f for f in ["name", "generic_name", "drug_class"] if not d.get(f)]
        if missing:
            return err(f"Missing fields: {', '.join(missing)}")
        if Medication.objects.filter(name__iexact=d["name"]).exists():
            return err("A medication with this name already exists.")
        med = Medication.objects.create(
            name=d["name"], generic_name=d["generic_name"],
            drug_class=d["drug_class"], common_uses=d.get("common_uses", ""),
            standard_dosage=d.get("standard_dosage", ""),
            contraindications=d.get("contraindications", ""),
            side_effects=d.get("side_effects", ""),
            is_keml_listed=d.get("is_keml_listed", True),
        )
        return ok({"id": med.id, "name": med.name}, 201)


def _serialize_med(m):
    return {
        "id": m.id, "name": m.name, "generic_name": m.generic_name,
        "drug_class": m.drug_class, "common_uses": m.common_uses,
        "standard_dosage": m.standard_dosage, "is_keml_listed": m.is_keml_listed,
    }


class AdminMedicationDetailView(APIView):
    permission_classes = [IsAdminRole]

    def patch(self, request, pk):
        try:
            med = Medication.objects.get(pk=pk)
        except Medication.DoesNotExist:
            return err("Medication not found.", 404)
        for field in ["name", "generic_name", "drug_class", "common_uses",
                      "standard_dosage", "contraindications", "side_effects", "is_keml_listed"]:
            if field in request.data:
                setattr(med, field, request.data[field])
        med.save()
        return ok({"message": "Medication updated."})

    def delete(self, request, pk):
        try:
            med = Medication.objects.get(pk=pk)
        except Medication.DoesNotExist:
            return err("Medication not found.", 404)
        med.delete()
        return ok({"message": "Medication deleted."})


# ═════════════════════════════════════════════════════════════════════════════
# 5. STATISTICS
# ═════════════════════════════════════════════════════════════════════════════

class AdminStatsView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        now = timezone.now()

        mood_trend = []
        for i in range(29, -1, -1):
            day = now - timedelta(days=i)
            avg = MoodEntry.objects.filter(
                recorded_at__date=day.date()
            ).aggregate(a=Avg("mood_score"))["a"]
            mood_trend.append({"date": day.strftime("%b %d"), "avg": round(avg, 1) if avg else None})

        lab_trend = []
        for i in range(13, -1, -1):
            day = now - timedelta(days=i)
            lab_trend.append({
                "date":  day.strftime("%b %d"),
                "count": LabResult.objects.filter(created_at__date=day.date()).count(),
            })

        return ok({
            "totals": {
                "glucose_readings":  GlucoseReading.objects.count(),
                "bp_readings":       BloodPressureReading.objects.count(),
                "mood_entries":      MoodEntry.objects.count(),
                "lab_results":       LabResult.objects.count(),
                "drug_interactions": DrugInteraction.objects.count(),
                "coping_strategies": CopingStrategy.objects.filter(is_active=True).count(),
            },
            "bp_averages": BloodPressureReading.objects.aggregate(
                avg_sys=Avg("systolic"), avg_dia=Avg("diastolic")
            ),
            "glucose_by_context": list(
                GlucoseReading.objects.values("context")
                .annotate(avg=Avg("value_mg_dl"), count=Count("id"))
            ),
            "mood_trend_30d": mood_trend,
            "top_prescribed_drugs": list(
                PatientMedication.objects.values("medication__name")
                .annotate(count=Count("id")).order_by("-count")[:10]
            ),
            "lab_trend_14d": lab_trend,
        })


# ═════════════════════════════════════════════════════════════════════════════
# 6. AUDIT LOG
# ═════════════════════════════════════════════════════════════════════════════

class AdminAuditLogView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        lines_to_read = int(request.query_params.get("lines", 100))
        log_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "logs", "shes.log"
        )
        try:
            with open(log_path, "r") as f:
                lines = f.readlines()[-lines_to_read:]
            entries = [{"raw": line.strip()} for line in reversed(lines) if line.strip()]
        except FileNotFoundError:
            return err("logs/audit.log not found. Ensure the logs directory exists.", 404)
        return ok({"entries": entries, "total_returned": len(entries)})
    
