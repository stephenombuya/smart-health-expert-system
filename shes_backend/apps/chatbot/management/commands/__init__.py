"""
Seeds the knowledge base with clinical content and generates embeddings.
Run: python manage.py seed_knowledge_vectors

Warning: This calls the OpenAI API for each chunk (~10 API calls).
Costs approximately $0.001 total.
"""
from django.core.management.base import BaseCommand
from apps.chatbot.knowledge_base import KNOWLEDGE_CHUNKS
from apps.chatbot.models import KnowledgeChunk
from apps.chatbot.embeddings import get_embedding


class Command(BaseCommand):
    help = "Seeds the chatbot knowledge base with Kenya MOH guidelines and generates embeddings."

    def handle(self, *args, **options):
        self.stdout.write("Seeding knowledge base...")
        created = 0
        updated = 0

        for chunk_data in KNOWLEDGE_CHUNKS:
            self.stdout.write(f"  Processing: {chunk_data['title'][:60]}...")

            # Generate embedding
            try:
                embedding = get_embedding(chunk_data["content"])
            except Exception as exc:
                self.stdout.write(
                    self.style.WARNING(f"  Failed to embed: {exc}")
                )
                continue

            chunk, is_new = KnowledgeChunk.objects.update_or_create(
                title=chunk_data["title"],
                defaults={
                    "content":   chunk_data["content"],
                    "source":    chunk_data["source"],
                    "embedding": embedding,
                },
            )
            if is_new:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. {created} chunks created, {updated} updated. "
                f"Knowledge base is ready."
            )
        )