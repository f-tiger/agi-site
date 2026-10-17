#!/usr/bin/env python3
"""Persist an already validated automatic content batch, then release it in this run.

No rebase, force push, remote dispatch or broad git-add is permitted. A concurrent
main change stops the release, leaving both the generated output and receipts for
inspection. GITHUB_TOKEN pushes do not trigger another Actions run; the caller
continues through its existing deploy step with the exact committed DEPLOY_SHA.
"""
import argparse
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys

PREFIX = 'sites/getecoback/'
SITE = PREFIX + 'site'
DATA = {PREFIX + 'data/auto-content.json', PREFIX + 'data/auto-content-ledger.json'}
ROUTE = re.compile(r'^/(?:en/)?guide/[a-z0-9]+(?:-[a-z0-9]+)*\.html$')
SHA = re.compile(r'^[0-9a-f]{40}$')
BASE = 'https://getecoback.com'
MARKER = '<!--EB_AUTO_CONTENT-->'


class Rejected(RuntimeError):
    pass


def git(repo, *args):
    result = subprocess.run(['git', *args], cwd=repo, text=True, capture_output=True)
    if result.returncode:
        raise Rejected('git ' + args[0] + ' failed: ' + result.stderr.strip())
    return result.stdout.strip()


def read_json(path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError) as error:
        raise Rejected('Missing or invalid JSON: ' + str(path)) from error


def checked_file(repo, name):
    if not isinstance(name, str) or PurePosixPath(name).as_posix() != name or '..' in PurePosixPath(name).parts or name.startswith('/'):
        raise Rejected('Invalid relative publication path')
    file = repo / name
    if not file.is_file() or not file.resolve().is_relative_to(repo.resolve()):
        raise Rejected('Publication path missing or outside repository: ' + name)
    if any(parent.is_symlink() for parent in [file, *file.parents] if parent != repo and parent.is_relative_to(repo)):
        raise Rejected('Symlink publication path is not allowed: ' + name)
    return file


def validate_receipt(repo, receipt, head):
    if not isinstance(receipt, dict) or type(receipt.get('schema_version')) is not int or receipt.get('schema_version') != 1:
        raise Rejected('Unsupported publication receipt')
    before = receipt.get('before_sha')
    if not isinstance(before, str) or not SHA.fullmatch(before) or before != head:
        raise Rejected('Receipt does not match the validated source SHA')
    if type(receipt.get('changed')) is not bool:
        raise Rejected('Publication changed flag must be a boolean')
    paths, urls = receipt.get('paths'), receipt.get('canonical_urls')
    if not isinstance(paths, list) or not all(isinstance(path, str) for path in paths) or len(paths) != len(set(paths)):
        raise Rejected('Publication paths must be a unique string list')
    if not isinstance(urls, list) or not all(isinstance(url, str) for url in urls) or len(urls) != len(set(urls)):
        raise Rejected('Canonical URLs must be a unique string list')
    if receipt['changed'] != bool(paths):
        raise Rejected('Publication changed flag disagrees with paths')
    routes = []
    for name in paths:
        checked_file(repo, name)
        if name in DATA:
            continue
        route = name[len(SITE):] if name.startswith(SITE + '/') else ''
        if not ROUTE.fullmatch(route):
            raise Rejected('Publication path is outside the controlled content surface: ' + name)
        routes.append(route)
    if len(routes) > 1:
        raise Rejected('Automatic publication exceeds the one-page batch allowance')
    if set(urls) != {BASE + route for route in routes}:
        raise Rejected('Canonical URL list does not match the changed HTML paths')
    if paths:
        facts = read_json(checked_file(repo, PREFIX + 'data/auto-content.json'))
        ledger = read_json(checked_file(repo, PREFIX + 'data/auto-content-ledger.json'))
        if not isinstance(facts, dict) or not isinstance(ledger, dict):
            raise Rejected('Automatic content facts and ledger must be objects')
        fact_pages, owned = facts.get('pages'), ledger.get('pages')
        if not isinstance(fact_pages, dict) or not isinstance(owned, dict):
            raise Rejected('Automatic content facts and ledger must own a pages object')
        for route in routes:
            if route not in owned or route not in fact_pages:
                raise Rejected('Receipt attempts to commit a page not owned by facts and ledger: ' + route)
            html = checked_file(repo, SITE + route).read_text(encoding='utf-8')
            if MARKER not in html:
                raise Rejected('Automatic content marker missing: ' + route)
            canonical = re.findall(r'<link\s+rel="canonical"\s+href="([^"]+)"\s*/?>', html, re.I)
            if canonical != [BASE + route]:
                raise Rejected('Generated page canonical does not match its path: ' + route)
    return paths, urls


def write_outputs(env, before, after, committed):
    # Write only after the push (or verified no-op). A failed push must never
    # provide a usable release SHA to the following workflow step.
    if env.get('GITHUB_ENV'):
        with open(env['GITHUB_ENV'], 'a', encoding='utf-8') as handle:
            handle.write(f'DEPLOY_SHA={after}\nECO_AUTO_BEFORE={before}\nECO_AUTO_AFTER={after}\n')
    if env.get('GITHUB_OUTPUT'):
        with open(env['GITHUB_OUTPUT'], 'a', encoding='utf-8') as handle:
            handle.write(f'sha={after}\ncommitted={str(committed).lower()}\n')


def persist(repo, receipt_file, env=None):
    env = os.environ if env is None else env
    repo = repo.resolve()
    before = git(repo, 'rev-parse', 'HEAD')
    receipt = read_json(receipt_file)
    paths, urls = validate_receipt(repo, receipt, before)
    if git(repo, 'symbolic-ref', '--short', 'HEAD') != 'main':
        raise Rejected('Automatic publication requires the main branch')
    if git(repo, 'diff', '--cached', '--name-only'):
        raise Rejected('Pre-existing staged changes; refusing to include them in an automatic commit')
    metadata_changes = set(git(repo, 'diff', '--name-only', '--', *sorted(DATA)).splitlines())
    metadata_changes.update(git(repo, 'ls-files', '--others', '--exclude-standard', '--', *sorted(DATA)).splitlines())
    if not metadata_changes.issubset(paths):
        raise Rejected('Changed automatic content metadata is absent from the publication receipt')
    # Always verify remote freshness, including no-op retries. No reset/rebase
    # may discard or silently alter the exact generated files that passed gates.
    git(repo, 'fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main')
    if git(repo, 'rev-parse', 'refs/remotes/origin/main') != before:
        raise Rejected('Main advanced during the validated build; refusing stale publication. Re-run the existing workflow.')
    committed = False
    if paths:
        git(repo, 'add', '--', *paths)
        staged = git(repo, 'diff', '--cached', '--name-only', '-z').split('\0')
        staged = [name for name in staged if name]
        if any(name not in paths for name in staged):
            raise Rejected('Unexpected staged file outside the publication receipt')
        if git(repo, 'diff', '--cached', '--name-only', '--diff-filter=DTUXB'):
            raise Rejected('Automatic publication cannot delete or change file types')
        if staged:
            git(repo, '-c', 'user.name=EcoBack content bot', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com',
                'commit', '-m', 'content(eco): verified automatic content expansion [outcome-readonly-release]')
            # Normal non-force push closes the fetch/push race. A rejected push
            # fails the job; never rebase and release previously validated files.
            git(repo, 'push', 'origin', 'HEAD:refs/heads/main')
            committed = True
    after = git(repo, 'rev-parse', 'HEAD')
    result = {'status': 'persisted' if committed else 'unchanged', 'committed': committed,
              'before_sha': before, 'after_sha': after,
              'paths': paths if committed else [], 'canonical_urls': urls if committed else []}
    (receipt_file.parent / 'publication-result.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    write_outputs(env, before, after, committed)
    print(json.dumps(result))
    return after


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--receipt', type=Path, required=True)
    parser.add_argument('--repo', type=Path)
    args = parser.parse_args()
    repo = args.repo or Path(git(Path.cwd(), 'rev-parse', '--show-toplevel'))
    try:
        persist(repo, args.receipt)
    except Rejected as error:
        if args.receipt.parent.is_dir():
            (args.receipt.parent / 'publication-result.json').write_text(json.dumps({'status': 'failed', 'committed': False, 'reason': 'publication_transaction_failed_see_step_log'}) + '\n', encoding='utf-8')
        print('::error::' + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
