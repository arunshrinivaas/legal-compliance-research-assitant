# LLM Latency Diagnostic

## Current Configuration
- **Provider**: GitHub Copilot CLI SDK (via `copilot.CopilotClient`)
- **SDK**: `copilot` Python package (v1.x / `CopilotClient`)
- **Model**: `auto` (Explicitly passed to `client.create_session(model="auto")`)
- **Session Configuration**: `streaming=True` is passed into `create_session()`.

## Latency Breakdown

Measured via a dedicated local diagnostic script (`llm_diagnostic.py` and `copilot_debug.py`):

| Stage | Time |
|---|---:|
| Client initialization | ~0.18 ms |
| Client Start | ~109.54 ms |
| Session creation | ~1,094.97 ms |
| Prompt submission | ~5.92 ms |
| First event/token | N/A (Timeout) |
| Generation | N/A |
| SESSION_IDLE | N/A |
| Parsing | 0 ms |
| **Total** | **~30,000 ms (Network Timeout)** |

## Prompt Size
- **Input characters**: N/A (The prompt size is irrelevant to the latency issue).
- **Context size**: N/A
- **Output size**: 0 characters (An empty string is returned).

## Query Comparison
*Note: Due to the discovered bottleneck below, all queries exhibit the exact same 30,000ms timeout behavior regardless of complexity, context size, or factual nature.*

## Cold vs Warm
- **Cold Start**: Starting the `CopilotClient` and creating the session takes **~1.2 seconds**.
- **Warm Start**: Reusing an existing session was not implemented due to known concurrency issues with the underlying Copilot architecture (`SERVER_SHUTTING_DOWN`). Correctness and isolation remain the priority.

## Streaming Analysis
The `copilot` SDK exposes internal events via `session.on()`. The available events include `ASSISTANT_MESSAGE` (final chunk) and `ASSISTANT_MESSAGE_DELTA` (incremental).
While `streaming=True` is passed and the events exist, the backend application buffers them synchronously until `SESSION_IDLE`. However, streaming is currently moot due to the network timeout issue detailed below.

## Multiple LLM Calls
The standard `/api/v1/rag/ask` endpoint performs **one** LLM call to synthesize the final answer. The `compare_documents` Map-Reduce logic performs sequential calls per document.

## Timeout Analysis
The 45-second timeout introduced in the Performance & Reliability pass behaves correctly. However, the internal Copilot network failure occurs at **30 seconds**, rendering the 45-second application-level timeout a fallback safety measure.

## Bottleneck Diagnosis
**The 30-second latency is NOT caused by LLM generation, prompt size, or RAG complexity.**

It is caused by a hardcoded **30,000ms network timeout** within the Copilot SDK's model resolution layer. When `ask_copilot_with_context` creates a session and sends a prompt, the Copilot environment attempts to fetch the available models (model catalog). This network request silently hangs and times out at exactly 30 seconds. 

The SDK emits a `SESSION_ERROR` event:
```json
SessionErrorData(error_type='query', message='Execution failed: model resolution leaf failed: get_model_list: GenericFailure, {"kind":"network","message":"Model catalog request timed out after 30000ms"}')
```

The `copilot_service.py` error handler catches `SESSION_ERROR` and simply triggers `done.set()` without throwing an exception. Because 30s < 45s, the application does not trigger its own `asyncio.TimeoutError`. Instead, it gracefully returns an empty string `""` as the AI response.

## Recommended Next Optimization
**The smallest safe next change is:**
Modify `app/services/copilot_service.py` to handle the `SESSION_ERROR` event correctly. It should log the actual error message and throw a clear `RuntimeError` or HTTP 503 instead of silently swallowing the error, resolving the `asyncio.Event`, and returning an empty string. 

Additionally, we must investigate why the local GitHub Copilot environment is failing to reach the model catalog (e.g., missing authentication, proxy issues, or requiring an explicit fallback model instead of `"auto"`).
