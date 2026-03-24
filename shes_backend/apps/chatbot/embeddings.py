"""
SHES Chatbot – Embedding Utilities
Generates and searches OpenAI text embeddings for RAG retrieval.
"""
import os
import logging
import math
from typing import List

logger = logging.getLogger("apps.chatbot")


def get_embedding(text: str) -> List[float]:
    """Generate an embedding vector for a text string."""
    from openai import OpenAI
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    dot   = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a ** 2 for a in vec_a))
    mag_b = math.sqrt(sum(b ** 2 for b in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def find_relevant_chunks(query: str, top_k: int = 4) -> list:
    """
    Find the most relevant knowledge base chunks for a query.
    Uses cosine similarity on pre-computed embeddings.
    Returns top_k most relevant KnowledgeChunk objects.
    """
    from .models import KnowledgeChunk

    # Get embedding for the query
    query_embedding = get_embedding(query)

    # Load all chunks that have embeddings
    chunks = KnowledgeChunk.objects.exclude(embedding=None)

    if not chunks.exists():
        logger.warning("Knowledge base is empty. Run: python manage.py seed_knowledge_base_vectors")
        return []

    # Score all chunks
    scored = []
    for chunk in chunks:
        if chunk.embedding:
            sim = cosine_similarity(query_embedding, chunk.embedding)
            scored.append((sim, chunk))

    # Return top K by similarity
    scored.sort(key=lambda x: x[0], reverse=True)
    return [chunk for _, chunk in scored[:top_k]]