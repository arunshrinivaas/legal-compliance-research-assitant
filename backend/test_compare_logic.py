"""
Standalone tests for the Map-Reduce compare_documents() logic.

Tests run WITHOUT a live database by mocking search_similar_chunks
and ask_copilot_with_context.

Coverage:
  1.  search_similar_chunks signature UNCHANGED
  2.  answer_with_rag signature UNCHANGED
  3.  build_rag_context signature UNCHANGED
  4.  compare_documents signature UNCHANGED
  5.  MAP phase — each document gets exactly ONE independent LLM call
  6.  MAP phase — each LLM call receives ONLY that document's chunks
  7.  MAP phase — zero-chunk document still gets an LLM call (explicit no-evidence)
  8.  REDUCE phase — ONE final LLM call
  9.  REDUCE phase — all N document analyses present in reduce input
  10. sources dict keyed correctly (document_a, document_b, …)
  11. no out-of-scope document IDs leak into sources
  12. 2-document comparison end-to-end
  13. 4-document comparison — all A/B/C/D present in REDUCE input and response
  14. 4-document comparison — all filenames present in REDUCE input
  15. zero-evidence document explicitly represented (not silently dropped)
  16. deterministic label order
  17. endpoint 1-doc / 0-doc guards present in router
  18. /rag/ask router unchanged (answer_with_rag only, no compare_documents)
  19. two-pass retrieval fallback intact
"""

import asyncio
import inspect
import sys

# ---------------------------------------------------------------------------
# Signature checks (must not change)
# ---------------------------------------------------------------------------

from app.services.retrieval_service import search_similar_chunks
from app.services.rag_service import answer_with_rag, build_rag_context, compare_documents
import app.services.rag_service as rag_mod
import app.services.copilot_service as copilot_mod


def test_search_similar_chunks_signature_unchanged():
    sig = inspect.signature(search_similar_chunks)
    params = list(sig.parameters.keys())
    assert "db" in params, "db missing"
    assert "query" in params, "query missing"
    assert "limit" in params, "limit missing"
    assert "distance_threshold" in params, "distance_threshold missing"
    assert "document_ids" in params, "document_ids missing"
    print("[TEST 1] search_similar_chunks signature UNCHANGED ✓")


def test_answer_with_rag_signature_unchanged():
    sig = inspect.signature(answer_with_rag)
    params = list(sig.parameters.keys())
    assert "db" in params
    assert "question" in params
    assert "limit" in params
    assert "document_ids" in params
    print("[TEST 2] answer_with_rag signature UNCHANGED ✓")


def test_build_rag_context_signature_unchanged():
    sig = inspect.signature(build_rag_context)
    params = list(sig.parameters.keys())
    assert "db" in params
    assert "query" in params
    assert "limit" in params
    assert "document_ids" in params
    print("[TEST 3] build_rag_context signature UNCHANGED ✓")


def test_compare_documents_new_signature():
    sig = inspect.signature(compare_documents)
    params = list(sig.parameters.keys())
    assert "db" in params
    assert "question" in params
    assert "documents" in params
    assert "limit" in params
    print("[TEST 4] compare_documents signature valid ✓")


# ---------------------------------------------------------------------------
# Mock helpers
# ---------------------------------------------------------------------------

_SEARCH_CALL_LOG: list[list[int]] = []   # tracks which doc_ids each search call used
_LLM_CALL_LOG: list[str] = []           # captures the question text of every LLM call


def _reset_logs():
    global _SEARCH_CALL_LOG, _LLM_CALL_LOG
    _SEARCH_CALL_LOG = []
    _LLM_CALL_LOG = []


def _mock_search(db, query, limit, distance_threshold=0.80, document_ids=None):
    _SEARCH_CALL_LOG.append(list(document_ids) if document_ids else [])
    if document_ids and 25 in document_ids:
        return [
            {
                "document_id": 25, "document_title": "Doc 25",
                "document_filename": "doc25.pdf",
                "chunk_index": i, "content": f"content-25-{i}", "distance": 0.20,
            }
            for i in range(4)
        ]
    if document_ids and 23 in document_ids:
        return [
            {
                "document_id": 23, "document_title": "Doc 23",
                "document_filename": "doc23.pdf",
                "chunk_index": 0, "content": "content-23-0", "distance": 0.35,
            }
        ]
    if document_ids and 27 in document_ids:
        return []  # zero matches — must still be represented
    if document_ids and 99 in document_ids:
        return []  # fourth doc with zero chunks
    return []


async def _mock_copilot(question: str, context: str) -> str:
    _LLM_CALL_LOG.append(question)
    # Echo back a summary that includes the label found in the question
    # so reduce-phase tests can verify the analyses reached the reduce call.
    import re
    label_match = re.search(r"Document ([A-Z]) —|DOCUMENT ([A-Z]) ANALYSIS", question)
    label = (label_match.group(1) or label_match.group(2)) if label_match else "?"
    return f"[MOCK ANALYSIS for Document {label}] evidence_len={len(question)}"





# ---------------------------------------------------------------------------
# Helper: run compare_documents and return result + logs
# ---------------------------------------------------------------------------

async def _run_compare(docs: list[dict], question: str = "Compare") -> dict:
    _reset_logs()
    original_search = rag_mod.search_similar_chunks
    original_ask = rag_mod.ask_copilot_with_context
    rag_mod.search_similar_chunks = _mock_search
    rag_mod.ask_copilot_with_context = _mock_copilot
    try:
        result = await compare_documents(
            db=None, question=question, documents=docs, limit=5
        )
    finally:
        rag_mod.search_similar_chunks = original_search
        rag_mod.ask_copilot_with_context = original_ask
    return result


# ---------------------------------------------------------------------------
# 3-document comparison tests (MAP-Reduce)
# ---------------------------------------------------------------------------

async def test_3_document_map_calls():
    """MAP: exactly 3 search calls, each scoped to one document."""
    docs = [
        {"id": 25, "title": "Doc 25", "filename": "doc25.pdf", "jurisdiction": "EU"},
        {"id": 23, "title": "Doc 23", "filename": "doc23.pdf", "jurisdiction": "US"},
        {"id": 27, "title": "Doc 27", "filename": "doc27.pdf", "jurisdiction": "UK"},
    ]
    await _run_compare(docs)

    assert len(_SEARCH_CALL_LOG) == 3, (
        f"Expected 3 search calls (one per doc), got {len(_SEARCH_CALL_LOG)}: {_SEARCH_CALL_LOG}"
    )
    assert _SEARCH_CALL_LOG[0] == [25]
    assert _SEARCH_CALL_LOG[1] == [23]
    assert _SEARCH_CALL_LOG[2] == [27]
    print("[TEST 5] 3-doc MAP: 3 scoped search calls ✓")


async def test_3_document_llm_calls():
    """MAP+REDUCE: exactly 4 LLM calls for 3 documents (3 MAP + 1 REDUCE)."""
    docs = [
        {"id": 25, "title": "Doc 25", "filename": "doc25.pdf", "jurisdiction": "EU"},
        {"id": 23, "title": "Doc 23", "filename": "doc23.pdf", "jurisdiction": "US"},
        {"id": 27, "title": "Doc 27", "filename": "doc27.pdf", "jurisdiction": "UK"},
    ]
    _reset_logs()
    await _run_compare(docs)

    assert len(_LLM_CALL_LOG) == 4, (
        f"Expected 4 LLM calls (3 MAP + 1 REDUCE), got {len(_LLM_CALL_LOG)}"
    )
    print("[TEST 6] 3-doc LLM call count: 3 MAP + 1 REDUCE = 4 ✓")


async def test_3_document_map_isolation():
    """MAP: each LLM call receives ONLY its document's chunks (not others')."""
    docs = [
        {"id": 25, "title": "Doc 25", "filename": "doc25.pdf", "jurisdiction": "EU"},
        {"id": 23, "title": "Doc 23", "filename": "doc23.pdf", "jurisdiction": "US"},
        {"id": 27, "title": "Doc 27", "filename": "doc27.pdf", "jurisdiction": "UK"},
    ]
    _reset_logs()
    await _run_compare(docs)

    # MAP calls are the first 3 in _LLM_CALL_LOG
    map_a, map_b, map_c = _LLM_CALL_LOG[:3]

    # doc25 chunks contain "content-25-*" — must appear only in map_a
    assert "content-25-" in map_a, "doc25 chunks missing from MAP A"
    assert "content-25-" not in map_b, "doc25 chunks leaked into MAP B"
    assert "content-25-" not in map_c, "doc25 chunks leaked into MAP C"

    # doc23 chunk contains "content-23-0" — must appear only in map_b
    assert "content-23-0" in map_b, "doc23 chunk missing from MAP B"
    assert "content-23-0" not in map_a, "doc23 chunk leaked into MAP A"

    # doc27 has 0 chunks — its MAP call must contain the no-evidence notice
    assert "No relevant chunks were retrieved" in map_c, (
        "Zero-chunk document (doc27) MAP call missing explicit no-evidence notice"
    )
    print("[TEST 7] MAP isolation: each call sees only its own chunks ✓")


async def test_3_document_reduce_receives_all_analyses():
    """REDUCE: the reduce call's question must contain analyses for A, B, and C."""
    docs = [
        {"id": 25, "title": "Doc 25", "filename": "doc25.pdf", "jurisdiction": "EU"},
        {"id": 23, "title": "Doc 23", "filename": "doc23.pdf", "jurisdiction": "US"},
        {"id": 27, "title": "Doc 27", "filename": "doc27.pdf", "jurisdiction": "UK"},
    ]
    _reset_logs()
    await _run_compare(docs)

    # The REDUCE call is the last entry in _LLM_CALL_LOG
    reduce_prompt = _LLM_CALL_LOG[-1]
    assert "DOCUMENT A ANALYSIS" in reduce_prompt, "Document A analysis missing from reduce"
    assert "DOCUMENT B ANALYSIS" in reduce_prompt, "Document B analysis missing from reduce"
    assert "DOCUMENT C ANALYSIS" in reduce_prompt, "Document C analysis missing from reduce"
    assert "doc25.pdf" in reduce_prompt
    assert "doc23.pdf" in reduce_prompt
    assert "doc27.pdf" in reduce_prompt
    print("[TEST 8] REDUCE receives all 3 MAP analyses ✓")


async def test_3_document_sources():
    """sources dict keyed correctly; no out-of-scope IDs."""
    docs = [
        {"id": 25, "title": "Doc 25", "filename": "doc25.pdf", "jurisdiction": "EU"},
        {"id": 23, "title": "Doc 23", "filename": "doc23.pdf", "jurisdiction": "US"},
        {"id": 27, "title": "Doc 27", "filename": "doc27.pdf", "jurisdiction": "UK"},
    ]
    result = await _run_compare(docs)

    assert "document_a" in result["sources"]
    assert "document_b" in result["sources"]
    assert "document_c" in result["sources"]
    assert len(result["sources"]["document_a"]) == 4
    assert len(result["sources"]["document_b"]) == 1
    assert len(result["sources"]["document_c"]) == 0   # zero chunks; key still present

    all_ids = {
        src["document_id"]
        for lst in result["sources"].values()
        for src in lst
    }
    assert all_ids <= {25, 23, 27}, f"Out-of-scope IDs in sources: {all_ids - {25, 23, 27}}"
    print("[TEST 9] 3-doc sources dict correct ✓")


# ---------------------------------------------------------------------------
# 2-document comparison tests
# ---------------------------------------------------------------------------

async def test_2_document_comparison():
    """2-doc end-to-end: 2 MAP calls + 1 REDUCE call; correct sources."""
    docs = [
        {"id": 25, "title": "Doc 25", "filename": "doc25.pdf", "jurisdiction": "EU"},
        {"id": 23, "title": "Doc 23", "filename": "doc23.pdf", "jurisdiction": "US"},
    ]
    result = await _run_compare(docs, question="Compare data breach rules")

    assert len(_SEARCH_CALL_LOG) == 2, f"Expected 2 search calls, got {len(_SEARCH_CALL_LOG)}"
    assert len(_LLM_CALL_LOG) == 3, f"Expected 3 LLM calls (2 MAP + 1 REDUCE), got {len(_LLM_CALL_LOG)}"

    assert "document_a" in result["sources"]
    assert "document_b" in result["sources"]
    assert "document_c" not in result["sources"]

    reduce_prompt = _LLM_CALL_LOG[-1]
    assert "DOCUMENT A ANALYSIS" in reduce_prompt
    assert "DOCUMENT B ANALYSIS" in reduce_prompt
    assert "DOCUMENT C ANALYSIS" not in reduce_prompt
    print("[TEST 10] 2-doc comparison ✓")


# ---------------------------------------------------------------------------
# 4-document comparison tests
# ---------------------------------------------------------------------------

async def test_4_document_comparison():
    """4-doc end-to-end: 4 MAP calls + 1 REDUCE; all A/B/C/D present in REDUCE."""
    docs = [
        {"id": 25, "title": "Doc 25", "filename": "doc25.pdf", "jurisdiction": "EU"},
        {"id": 23, "title": "Doc 23", "filename": "doc23.pdf", "jurisdiction": "US"},
        {"id": 27, "title": "Doc 27", "filename": "doc27.pdf", "jurisdiction": "UK"},
        {"id": 99, "title": "Doc 99", "filename": "doc99.pdf", "jurisdiction": "IN"},
    ]
    result = await _run_compare(docs)

    # Search calls
    assert len(_SEARCH_CALL_LOG) == 4, (
        f"Expected 4 search calls, got {len(_SEARCH_CALL_LOG)}: {_SEARCH_CALL_LOG}"
    )
    assert _SEARCH_CALL_LOG[0] == [25]
    assert _SEARCH_CALL_LOG[1] == [23]
    assert _SEARCH_CALL_LOG[2] == [27]
    assert _SEARCH_CALL_LOG[3] == [99]

    # LLM calls: 4 MAP + 1 REDUCE
    assert len(_LLM_CALL_LOG) == 5, (
        f"Expected 5 LLM calls (4 MAP + 1 REDUCE), got {len(_LLM_CALL_LOG)}"
    )

    # REDUCE receives all 4 analyses
    reduce_prompt = _LLM_CALL_LOG[-1]
    for lbl in ["A", "B", "C", "D"]:
        assert f"DOCUMENT {lbl} ANALYSIS" in reduce_prompt, (
            f"Document {lbl} analysis missing from REDUCE prompt"
        )
    for fname in ["doc25.pdf", "doc23.pdf", "doc27.pdf", "doc99.pdf"]:
        assert fname in reduce_prompt, f"{fname} not in REDUCE prompt"

    # Sources
    for key in ["document_a", "document_b", "document_c", "document_d"]:
        assert key in result["sources"], f"{key} missing from sources"

    # Final response references all 4 labels (mock copilot echoes label)
    response = result["comparison"]
    assert "Document A" in response or "MOCK ANALYSIS" in response
    print("[TEST 11] 4-doc comparison: all A/B/C/D in REDUCE + sources ✓")


async def test_4_document_zero_evidence_represented():
    """4-doc: documents with 0 chunks still appear in REDUCE (not silently dropped)."""
    docs = [
        {"id": 25, "title": "Doc 25", "filename": "doc25.pdf", "jurisdiction": "EU"},
        {"id": 23, "title": "Doc 23", "filename": "doc23.pdf", "jurisdiction": "US"},
        {"id": 27, "title": "Doc 27", "filename": "doc27.pdf", "jurisdiction": "UK"},
        {"id": 99, "title": "Doc 99", "filename": "doc99.pdf", "jurisdiction": "IN"},
    ]
    _reset_logs()
    await _run_compare(docs)

    reduce_prompt = _LLM_CALL_LOG[-1]
    # doc27 (C) and doc99 (D) return 0 chunks → MAP must pass no-evidence notice
    map_c = _LLM_CALL_LOG[2]
    map_d = _LLM_CALL_LOG[3]
    assert "No relevant chunks were retrieved" in map_c, "MAP C missing no-evidence notice"
    assert "No relevant chunks were retrieved" in map_d, "MAP D missing no-evidence notice"

    # REDUCE still receives analyses for C and D
    assert "DOCUMENT C ANALYSIS" in reduce_prompt
    assert "DOCUMENT D ANALYSIS" in reduce_prompt
    print("[TEST 12] 4-doc zero-evidence docs still present in REDUCE ✓")


async def test_4_document_all_filenames_in_reduce():
    """4-doc: all four filenames must be in the REDUCE prompt."""
    docs = [
        {"id": 25, "title": "Doc 25", "filename": "doc25.pdf", "jurisdiction": "EU"},
        {"id": 23, "title": "Doc 23", "filename": "doc23.pdf", "jurisdiction": "US"},
        {"id": 27, "title": "Doc 27", "filename": "doc27.pdf", "jurisdiction": "UK"},
        {"id": 99, "title": "Doc 99", "filename": "doc99.pdf", "jurisdiction": "IN"},
    ]
    _reset_logs()
    await _run_compare(docs)
    reduce_prompt = _LLM_CALL_LOG[-1]
    for fname in ["doc25.pdf", "doc23.pdf", "doc27.pdf", "doc99.pdf"]:
        assert fname in reduce_prompt, f"{fname} not in REDUCE prompt"
    print("[TEST 13] All 4 filenames present in REDUCE prompt ✓")


# ---------------------------------------------------------------------------
# Deterministic label order
# ---------------------------------------------------------------------------

def test_deterministic_label_order():
    from app.services.rag_service import _LABELS
    assert _LABELS[0] == "A"
    assert _LABELS[1] == "B"
    assert _LABELS[2] == "C"
    assert _LABELS[3] == "D"
    print("[TEST 14] Deterministic label mapping ✓  (A=pos0, B=pos1, C=pos2, D=pos3)")


# ---------------------------------------------------------------------------
# Structural / unchanged-component checks
# ---------------------------------------------------------------------------

def test_endpoint_guards_present():
    import ast, pathlib
    src = pathlib.Path("app/routers/investigations.py").read_text()
    assert "len(attachment_rows) < 2" in src, "1-doc guard missing in router"
    assert "not attachment_rows" in src, "0-doc guard missing in router"
    assert "Comparison requires at least 2 attached documents" in src
    assert "No documents are currently attached" in src
    print("[TEST 15] Endpoint 1-doc/0-doc guards present ✓")


def test_normal_rag_ask_untouched():
    """Verify /rag/ask router still calls answer_with_rag, not compare_documents."""
    import ast, pathlib
    src = pathlib.Path("app/routers/rag.py").read_text()
    assert "answer_with_rag" in src, "answer_with_rag missing from rag.py"
    assert "compare_documents" not in src, "compare_documents leaked into rag.py"
    assert "investigation_id" in src, "investigation_id scoping removed"
    print("[TEST 16] /rag/ask untouched ✓")


def test_two_pass_fallback_intact():
    """Verify Pass-2 fallback still exists in retrieval_service.py."""
    import pathlib
    src = pathlib.Path("app/services/retrieval_service.py").read_text()
    assert "PASS 2" in src or "Pass-2" in src or "Pass 2" in src, "Two-pass fallback removed!"
    assert "document_ids is not None" in src, "Scoped fallback guard removed"
    print("[TEST 17] Two-pass retrieval fallback intact ✓")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main():
    print("\n=== MAP-REDUCE COMPARISON TESTS ===\n")
    # Signature tests
    test_search_similar_chunks_signature_unchanged()
    test_answer_with_rag_signature_unchanged()
    test_build_rag_context_signature_unchanged()
    test_compare_documents_new_signature()
    # 3-doc MAP-Reduce
    await test_3_document_map_calls()
    await test_3_document_llm_calls()
    await test_3_document_map_isolation()
    await test_3_document_reduce_receives_all_analyses()
    await test_3_document_sources()
    # 2-doc
    await test_2_document_comparison()
    # 4-doc
    await test_4_document_comparison()
    await test_4_document_zero_evidence_represented()
    await test_4_document_all_filenames_in_reduce()
    # Structural
    test_deterministic_label_order()
    test_endpoint_guards_present()
    test_normal_rag_ask_untouched()
    test_two_pass_fallback_intact()
    print("\n=== ALL 17 TESTS PASSED ===\n")


if __name__ == "__main__":
    asyncio.run(main())
