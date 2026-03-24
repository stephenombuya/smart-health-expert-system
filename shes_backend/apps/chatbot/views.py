"""
SHES Chatbot – Views
POST /api/v1/chat/ — sends a message and receives an AI response.
GET  /api/v1/chat/history/ — retrieves conversation history.
DELETE /api/v1/chat/history/ — clears conversation history.
"""
import os
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

logger = logging.getLogger("apps.chatbot")

SAFETY_PROMPT = """You are SHES Assistant, the AI health advisor for the Smart Health Expert System (SHES),
a clinical decision support tool used in Kenya.

Your role:
- Answer health questions using ONLY the provided Kenya MOH guideline context
- Explain medical terms in simple language (assume Standard 8 education level)
- Be empathetic, calm, and culturally sensitive to Kenyan patients
- Respond in the same language the patient uses (English or Swahili)

Strict rules:
1. NEVER diagnose a patient — you provide information, not diagnosis
2. NEVER recommend specific drug dosages not in the provided context
3. ALWAYS recommend consulting a qualified doctor for personal medical decisions
4. For ANY emergency symptoms (chest pain, difficulty breathing, loss of consciousness,
   stroke signs, severe bleeding), IMMEDIATELY say: "This sounds like a medical emergency.
   Please call 999 or go to your nearest emergency department NOW."
5. For suicidal thoughts or mental health crisis: Always provide Befrienders Kenya (0800 723 253)
6. If the question is outside health/medical topics, politely decline and redirect
7. Keep responses concise — maximum 200 words
8. Always end with a reminder to consult a healthcare provider

You have access to the patient's health data context to personalise your responses."""


class ChatView(APIView):
    """POST /api/v1/chat/ — sends a user message and returns AI response."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_message = request.data.get("message", "").strip()
        if not user_message:
            return Response(
                {"success": False, "error": "Message cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(user_message) > 1000:
            return Response(
                {"success": False, "error": "Message too long. Maximum 1000 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            return Response(
                {"success": False, "error": "AI service is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            from openai import OpenAI
            from .models import ChatMessage
            from .embeddings import find_relevant_chunks

            client = OpenAI(api_key=api_key)

            # Step 1: Find relevant knowledge base chunks (RAG retrieval)
            relevant_chunks = find_relevant_chunks(user_message, top_k=3)
            knowledge_context = "\n\n".join([
                f"--- {chunk.title} ({chunk.source}) ---\n{chunk.content.strip()}"
                for chunk in relevant_chunks
            ]) if relevant_chunks else "No specific guideline context found for this query."

            # Step 2: Build patient health context
            patient_context = self._build_patient_context(request.user)

            # Step 3: Get last 6 messages for conversation memory
            history = ChatMessage.objects.filter(
                user=request.user
            ).order_by("-created_at")[:6]
            history_messages = [
                {"role": msg.role, "content": msg.content}
                for msg in reversed(history)
            ]

            # Step 4: Build the full message array
            messages = [
                {
                    "role": "system",
                    "content": (
                        f"{SAFETY_PROMPT}\n\n"
                        f"=== KENYA MOH GUIDELINE CONTEXT ===\n{knowledge_context}\n\n"
                        f"=== PATIENT HEALTH SUMMARY ===\n{patient_context}"
                    ),
                },
                *history_messages,
                {"role": "user", "content": user_message},
            ]

            # Step 5: Call OpenAI
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                temperature=0.3,
                max_tokens=400,
            )

            assistant_reply = response.choices[0].message.content.strip()

            # Step 6: Persist both messages
            ChatMessage.objects.create(
                user=request.user, role="user", content=user_message
            )
            ChatMessage.objects.create(
                user=request.user, role="assistant", content=assistant_reply
            )

            return Response({
                "success":  True,
                "message":  assistant_reply,
                "sources":  [chunk.title for chunk in relevant_chunks],
            })

        except Exception as exc:
            logger.error("Chat failed for user %s: %s", request.user.pk, exc)
            return Response(
                {
                    "success": False,
                    "error": "The AI assistant is temporarily unavailable. Please try again.",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _build_patient_context(self, user) -> str:
        """Build a brief health summary to personalise the AI's responses."""
        lines = [f"Patient: {user.get_full_name()}, {user.county or 'Kenya'}"]
        try:
            profile = user.patient_profile
            if profile.chronic_conditions:
                lines.append(f"Known conditions: {profile.chronic_conditions}")
            if profile.known_allergies:
                lines.append(f"Known allergies: {profile.known_allergies}")
        except Exception:
            pass
        try:
            from apps.chronic_tracking.models import GlucoseReading, BloodPressureReading
            from django.db.models import Avg
            from django.utils import timezone
            from datetime import timedelta
            since = timezone.now() - timedelta(days=7)
            avg_glucose = GlucoseReading.objects.filter(
                patient=user, recorded_at__gte=since
            ).aggregate(avg=Avg("value_mg_dl"))["avg"]
            avg_sys = BloodPressureReading.objects.filter(
                patient=user, recorded_at__gte=since
            ).aggregate(avg=Avg("systolic"))["avg"]
            if avg_glucose:
                lines.append(f"7-day avg fasting glucose: {avg_glucose:.1f} mg/dL")
            if avg_sys:
                lines.append(f"7-day avg systolic BP: {avg_sys:.1f} mmHg")
        except Exception:
            pass
        return "\n".join(lines)


class ChatHistoryView(APIView):
    """GET /api/v1/chat/history/ — returns conversation history."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import ChatMessage
        messages = ChatMessage.objects.filter(
            user=request.user
        ).order_by("created_at")[:50]
        return Response({
            "success": True,
            "messages": [
                {
                    "role":       m.role,
                    "content":    m.content,
                    "created_at": m.created_at.isoformat(),
                }
                for m in messages
            ],
        })

    def delete(self, request):
        """DELETE /api/v1/chat/history/ — clears conversation."""
        from .models import ChatMessage
        count, _ = ChatMessage.objects.filter(user=request.user).delete()
        return Response({"success": True, "deleted": count})