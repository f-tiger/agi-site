#!/usr/bin/env python3
"""Bind IndexNow to the effective, live-verified release, never run.head_sha.

Only `check` downloads receipts, from the exact successful main workflow run.
No production requests, submission, credentials changes or receipt fallback.
"""
import io
import json
from datetime import datetime
import os
from pathlib import Path
import re
import subprocess
import sys
import stat
import zipfile

REPO = 'f-tiger/agi-site'
WORKFLOW = '.github/workflows/deploy-agiscorecard.yml'
SHA = re.compile(r'[0-9a-f]{40}')
VERSION = re.compile(r'[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}')
# Preserve the existing gate's source scope.
SOURCES = ('sites/agiscorecard', 'tools/revenue-studio',
           'tools/member-studio', 'tools/fleet-analytics')


def require(ok, message):
    if not ok:
        raise ValueError(message)


def run(*args, cwd=None):
    return subprocess.check_output(args, text=True, cwd=cwd).strip()


def api(path):
    return json.loads(run('gh', 'api', f'repos/{REPO}/{path}'))


def artifact_name(run_id, attempt):
    return f'agi-deployment-receipt-{run_id}-{attempt}'


def validate_run(value):
    require(value.get('repository', {}).get('full_name') == REPO, 'Wrong repository')
    require(value.get('head_repository', {}).get('full_name') == REPO, 'Wrong head repository')
    require(value.get('path') == WORKFLOW, 'Wrong deployment workflow')
    require(value.get('head_branch') == 'main', 'Deployment was not from main')
    require(value.get('event') in ('push', 'schedule', 'workflow_dispatch'), 'Untrusted event')
    require(value.get('status') == 'completed' and value.get('conclusion') == 'success',
            'Deployment workflow has not succeeded')
    for field in ('id', 'run_attempt'):
        require(type(value.get(field)) is int and value[field] > 0, f'Invalid {field}')
    require(bool(SHA.fullmatch(value.get('head_sha', ''))), 'Invalid run head')


def validate_receipt(receipt, deployment):
    validate_run(deployment)
    expected = {'schema': 1, 'repository': REPO, 'workflow': WORKFLOW,
                'run_id': deployment['id'], 'run_attempt': deployment['run_attempt'],
                'run_head_sha': deployment['head_sha'], 'live_checks': 'passed'}
    for key, value in expected.items():
        require(type(receipt.get(key)) is type(value) and receipt[key] == value,
                f'Receipt mismatch: {key}')
    sha = receipt.get('deployed_sha', '')
    require(isinstance(sha, str) and bool(SHA.fullmatch(sha)), 'Invalid deployed SHA')
    version = receipt.get('worker_version', '')
    require(isinstance(version, str) and bool(VERSION.fullmatch(version)), 'Missing Worker version')
    return sha


def record():
    require(os.environ.get('GITHUB_REPOSITORY') == REPO, 'Wrong recording repository')
    require(os.environ.get('GITHUB_REF') == 'refs/heads/main', 'Only main can record')
    sha = os.environ.get('DEPLOY_SHA', '')
    require(bool(SHA.fullmatch(sha)), 'Missing effective release SHA')
    require(run('git', 'rev-parse', 'HEAD') == sha, 'Checkout differs from release')
    versions = re.findall(r'^Current Version ID: (' + VERSION.pattern + r')\s*$',
                          os.environ.get('WRANGLER_OUTPUT', ''), re.MULTILINE)
    require(len(versions) == 1, 'Expected one Wrangler Current Version ID')
    receipt = {'schema': 1, 'repository': REPO, 'workflow': WORKFLOW,
               'run_id': int(os.environ['GITHUB_RUN_ID']),
               'run_attempt': int(os.environ['GITHUB_RUN_ATTEMPT']),
               'run_head_sha': os.environ['GITHUB_SHA'], 'deployed_sha': sha,
               'worker_version': versions[0], 'live_checks': 'passed'}
    Path('agi-deployment-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')


def check_source(sha, cwd=None):
    # Reject an unrelated/future commit even if its selected source tree happens to match.
    run('git', 'merge-base', '--is-ancestor', sha, 'HEAD', cwd=cwd)
    run('git', 'diff', '--exit-code', sha, 'HEAD', '--', *SOURCES, cwd=cwd)


MAX_RUNS = 1000
MAX_ZIP = 16384
MAX_JSON = 4096


def latest_attempt():
    # Enumerate the ENTIRE retained history, never a created-time window: an
    # old run may have been rerun today. Over the bounded budget, refuse.
    rows, total = [], None
    for page in range(1, MAX_RUNS // 100 + 1):
        data = api(f'actions/workflows/deploy-agiscorecard.yml/runs?per_page=100&page={page}')
        count = data.get('total_count')
        require(type(count) is int and 0 < count <= MAX_RUNS, 'Deployment history exceeds verification budget or is empty')
        require(total is None or count == total, 'Deployment history changed during pagination')
        total = count
        batch = data.get('workflow_runs', [])
        require(isinstance(batch, list) and 0 < len(batch) <= 100, 'Incomplete deployment history')
        rows.extend(batch)
        if len(rows) >= total:
            break
    require(len(rows) == total and len({r['id'] for r in rows}) == total, 'Incomplete or duplicate deployment history')
    # Include non-main/manual runs: their event ref alone cannot prove that
    # checkout or some past workflow did not write production.
    # No ongoing attempt may be overlooked, including a queued old rerun.
    require(all(r.get('status') == 'completed' for r in rows), 'A deployment attempt is unfinished')
    def started(r):
        value = r.get('run_started_at', '')
        require(isinstance(value, str) and value.endswith('Z'), 'Missing attempt start time')
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    latest = max(rows, key=started)
    require(sum(started(r) == started(latest) for r in rows) == 1, 'Ambiguous deployment attempt order')
    # If attempts overlap, completion order alone cannot prove the last
    # production writer. Conservative rejection, including an old rerun.
    start = started(latest)
    for r in rows:
        if r['id'] != latest['id']:
            updated = r.get('updated_at', '')
            require(isinstance(updated, str) and updated.endswith('Z'), 'Missing attempt completion bound')
            require(datetime.fromisoformat(updated.replace('Z', '+00:00')) < start,
                    'Overlapping or later-updated deployment attempt')
    validate_run(latest)
    return latest


def download_receipt(artifact):
    artifact_id = artifact.get('id')
    require(type(artifact_id) is int and artifact_id > 0, 'Invalid artifact ID')
    size = artifact.get('size_in_bytes')
    require(type(size) is int and 0 < size <= MAX_ZIP, 'Artifact is too large')
    # Bind download to the immutable ID, not a mutable/ambiguous name lookup.
    with subprocess.Popen(['gh', 'api', f'repos/{REPO}/actions/artifacts/{artifact_id}/zip'],
                          stdout=subprocess.PIPE, stderr=subprocess.DEVNULL) as process:
        raw = process.stdout.read(MAX_ZIP + 1)
        if len(raw) > MAX_ZIP:
            process.kill()
        require(process.wait() == 0 and len(raw) <= MAX_ZIP, 'Artifact download failed or exceeded size limit')
    return read_receipt_zip(raw)


def read_receipt_zip(raw):
    require(0 < len(raw) <= MAX_ZIP, 'Invalid archive size')
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        entries = archive.infolist()
        require(len(entries) == 1, 'Expected exactly one receipt entry')
        entry = entries[0]
        mode = (entry.external_attr >> 16) & 0xffff
        require(entry.filename == 'agi-deployment-receipt.json' and not entry.is_dir()
                and stat.S_IFMT(mode) in (0, stat.S_IFREG), 'Invalid receipt entry path or type')
        require(not entry.flag_bits & 1 and entry.compress_type in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED),
                'Unsupported archive encoding')
        require(0 < entry.file_size <= MAX_JSON and 0 < entry.compress_size <= MAX_ZIP,
                'Receipt entry exceeds size limit')
        with archive.open(entry) as stream:
            payload = stream.read(MAX_JSON + 1)
        require(len(payload) == entry.file_size and len(payload) <= MAX_JSON, 'Invalid receipt payload size')
        receipt = json.loads(payload)
        require(isinstance(receipt, dict), 'Receipt must be an object')
        return receipt


def check():
    deployment = latest_attempt()
    run_id, attempt = deployment['id'], deployment['run_attempt']
    name = artifact_name(run_id, attempt)
    artifacts = api(f'actions/runs/{run_id}/artifacts?name={name}&per_page=100')
    matches = artifacts.get('artifacts', [])
    require(artifacts.get('total_count') == 1 and len(matches) == 1, 'Missing or ambiguous receipt')
    artifact = matches[0]
    require(artifact.get('name') == name and artifact.get('expired') is False, 'Invalid/expired receipt')
    require(artifact.get('workflow_run', {}).get('id') == run_id, 'Artifact run mismatch')
    receipt = download_receipt(artifact)
    sha = validate_receipt(receipt, deployment)
    check_source(sha)
    latest = latest_attempt()
    validate_run(latest)
    require((latest['id'], latest['run_attempt']) == (run_id, attempt), 'Deployment changed during verification')
    print(f'Verified deployed source {sha}; run {run_id}/{attempt}; Worker {receipt["worker_version"]}')


if __name__ == '__main__':
    try:
        require(len(sys.argv) == 2 and sys.argv[1] in ('record', 'check'), 'Usage: agi-deployment-receipt.py record|check')
        (record if sys.argv[1] == 'record' else check)()
    except (ValueError, KeyError, TypeError, OSError, zipfile.BadZipFile, subprocess.CalledProcessError) as error:
        sys.exit(f'AGI deployment gate refused: {error}')
