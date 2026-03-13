"""
sentiment.py — Gemini-based aspect sentiment extraction pipeline.
Extracts (aspect, opinion, sentiment, highlighted_review) from movie reviews.
"""

import json
import logging
import os
import re
import time

import pandas as pd
import pysbd
from google import genai
from google.genai import types

from system_prompt import SYSTEM_PROMPT

logger = logging.getLogger(__name__)

_segmenter = pysbd.Segmenter(language='en', clean=True)

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUTPUT_PATH = os.path.join(_BACKEND_DIR, '..', 'frontend', 'public', 'data', 'triplets.json')

MODEL = 'gemini-2.5-flash'
BATCH_SIZE = 75
MAX_RETRIES = 5

# Valid granular aspects from the system prompt (Gemini outputs these as 'aspect')
VALID_ASPECTS = frozenset({
    'characters', 'dialogue', 'plot', 'themes', 'writing (general)',
    'acting', 'casting', 'cinematography', 'costume & makeup',
    'production design', 'stunts & choreography', 'vfx & animation',
    'visuals (general)', 'editing & pacing', 'music', 'sound', 'general',
})

# Maps granular aspect (subaspect) → parent aspect category
ASPECT_MAP = {
    'characters':             'story',
    'dialogue':               'story',
    'plot':                   'story',
    'themes':                 'story',
    'writing (general)':      'story',
    'acting':                 'talent',
    'casting':                'talent',
    'cinematography':         'craft',
    'costume & makeup':       'craft',
    'editing & pacing':       'craft',
    'music':                  'craft',
    'production design':      'craft',
    'sound':                  'craft',
    'stunts & choreography':  'craft',
    'vfx & animation':        'craft',
    'visuals (general)':      'craft',
    'general':                'general',
}


def _parse_retry_delay(err_str: str) -> float:
    """Extract retryDelay seconds from an API error message."""
    m = re.search(r'retry(?:Delay)?[^0-9]*([0-9]+)s', err_str)
    return float(m.group(1)) + 2 if m else 60.0


def _repair_json(raw: str) -> list:
    """Best-effort recovery of malformed JSON from the model."""
    raw = raw.strip()
    if not raw:
        return []

    # 1. Direct parse
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else [data]
    except json.JSONDecodeError:
        pass

    # 2. Extract content between first [ and last ]
    start, end = raw.find('['), raw.rfind(']')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw[start:end + 1])
        except json.JSONDecodeError:
            # Narrow raw to the bracketed region so step 3 searches within it
            raw = raw[start:end + 1]

    # 3. Truncation repair: close at last complete object
    last_brace = raw.rfind('}')
    if last_brace != -1:
        try:
            return json.loads(raw[:last_brace + 1] + ']')
        except json.JSONDecodeError:
            try:
                obj = json.loads(raw[:last_brace + 1])
                return [obj] if isinstance(obj, dict) else []
            except json.JSONDecodeError:
                pass
    return []


def _call_gemini(client: genai.Client, batch: list[dict]) -> list[dict]:
    """Send a batch of sentences to Gemini and return parsed triplets."""
    payload = json.dumps(batch)
    for attempt in range(MAX_RETRIES):
        try:
            resp = client.models.generate_content(
                model=MODEL,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type='application/json',
                    http_options=types.HttpOptions(timeout=300_000),
                ),
                contents=payload,
            )
            # response_mime_type='application/json' guarantees clean JSON — no fence stripping needed.
            # _repair_json is kept as a safety net for unexpected truncation or wrapping.
            result = _repair_json(resp.text.strip())
            if not result and resp.text.strip():
                snippet = (resp.text[:200] + '...') if len(resp.text) > 200 else resp.text
                logger.warning('Could not parse response (model: %s). Sample: %s', MODEL, snippet)
            return result
        except Exception as e:
            err = str(e)
            if attempt < MAX_RETRIES - 1 and any(code in err for code in ('429', '503', 'quota')):
                delay = _parse_retry_delay(err)
                logger.warning('Retrying in %.0fs: %s', delay, e)
                time.sleep(delay)
            else:
                logger.error('Gemini call failed: %s', e)
                return []
    return []


def _validate_triplet(triplet: dict) -> dict | None:
    """Validate and normalize a single triplet. Returns None if invalid."""
    subaspect = str(triplet.get('aspect', '')).strip()   # Gemini outputs granular as 'aspect'
    opinion   = str(triplet.get('opinion', '')).strip()
    sentiment = str(triplet.get('sentiment', '')).strip().lower()
    review_sentence = str(triplet.get('review_sentence', '')).strip()

    if not subaspect or not opinion:
        return None
    if sentiment not in ('positive', 'negative'):
        return None

    key = subaspect.lower()
    if key not in VALID_ASPECTS:
        logger.warning('Unknown aspect "%s", skipping.', subaspect)
        return None

    return {
        'aspect':           ASPECT_MAP[key],   # parent category
        'subaspect':        key,                # granular label (lowercased)
        'opinion':          opinion,
        'sentiment':        sentiment,
        'highlightedReview': review_sentence,
    }


def run_extraction(
    df: pd.DataFrame,
    output_path: str | None = None,
    max_batches: int | None = None,
) -> pd.DataFrame:
    """
    Run the full sentiment extraction pipeline.
    Splits reviews into sentences, sends them to Gemini in batches,
    validates results, and exports to JSON with checkpoint support.
    """
    if output_path is None:
        output_path = DEFAULT_OUTPUT_PATH

    if os.path.exists(output_path):
        print(f'Loading cached triplets from {output_path}')
        return pd.read_json(output_path)

    checkpoint_path = output_path + '.checkpoint.json'
    client = genai.Client(api_key=os.environ['GEMINI_API_KEY'])

    # Build flat sentence list with source metadata
    sentence_meta: list[dict] = []
    for _, row in df.iterrows():
        sentences = _segmenter.segment(row['reviewText'])
        for sent in sentences:
            sentence_meta.append({'text': sent, 'row': row})

    total_batches = (len(sentence_meta) + BATCH_SIZE - 1) // BATCH_SIZE

    # Resume from checkpoint if available
    if os.path.exists(checkpoint_path):
        with open(checkpoint_path) as f:
            ckpt = json.load(f)
        rows = ckpt['rows']
        # Handle index-based resume vs legacy batch-based resume
        if 'next_index' in ckpt:
            start_index = ckpt['next_index']
        else:
            # Migration: old checkpoints used 'next_batch' with size 30
            start_index = ckpt.get('next_batch', 0) * 30
        
        print(f'Resuming from sentence {start_index} ({len(rows)} triplets so far)…')
    else:
        rows = []
        start_index = 0
        print(f'Processing {len(sentence_meta)} sentences…')

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    max_sentences = len(sentence_meta) if max_batches is None else (start_index + (max_batches * BATCH_SIZE))
    try:
        # Loop by absolute index instead of batch number
        for i in range(start_index, min(len(sentence_meta), max_sentences), BATCH_SIZE):
            chunk = sentence_meta[i : i + BATCH_SIZE]
            current_batch_num = (i // BATCH_SIZE) + 1
            print(f'  Batch {current_batch_num} (Index {i} to {i + len(chunk)})…')

            results = _call_gemini(
                client,
                [{'index': j, 'text': m['text']} for j, m in enumerate(chunk)],
            )
            time.sleep(5)

            for triplet in results:
                idx = triplet.get('index')
                if idx is None or idx >= len(chunk):
                    continue

                validated = _validate_triplet(triplet)
                if validated is None:
                    continue

                meta = chunk[idx]
                row = meta['row']
                rows.append({
                    'id': row['id'],
                    'title': row['title'],
                    'reviewId': row['reviewId'],
                    'criticName': row['criticName'],
                    'reviewDate': row['reviewDate'],
                    **validated,
                })

            # Checkpoint after every batch using an atomic write (temp file + rename)
            # to prevent file corruption if the process crashes mid-write.
            temp_checkpoint = checkpoint_path + '.tmp'
            with open(temp_checkpoint, 'w') as f:
                json.dump({'next_index': i + len(chunk), 'rows': rows}, f)
            os.replace(temp_checkpoint, checkpoint_path)
            
            # Log progress percentage
            progress = ((i + len(chunk)) / len(sentence_meta)) * 100
            print(f'  ✓ Progress: {progress:.1f}% ({len(rows)} triplets total)')

    except Exception as e:
        print(f'\nInterrupted at sentence index {i}: {e}')
        print(f'Progress saved to {checkpoint_path} — rerun to resume.')
        raise

    print(f'Extraction complete: {len(rows)} triplets')
    df_out = pd.DataFrame(rows)
    df_out.to_json(output_path, orient='records', indent=2)
    print(f'Exported {len(df_out)} rows to {output_path}')

    # Clean up checkpoint on success
    if os.path.exists(checkpoint_path):
        os.remove(checkpoint_path)

    return df_out
