"""Small, local TF-IDF retrieval model for the existing evidence collector.

Fit the reviewed task vocabulary, not private searches or imaginary conversion
labels. Cosine similarity is a retrieval score, NEVER a purchase probability.
Approximate matches may suggest research only; source/publication gates stay
authoritative. No network calls, credentials, packages or inference spend.
"""
import math
import re
import unicodedata
from collections import Counter

STOP = set('the and for with how can my a an to of in on at is are der die das und fuer mit wie ich im am an ein eine de het een van en of'.split())

def tokens(text):
    text = str(text).casefold().replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c))
    return [w for w in re.findall(r'[^\W_]+', text) if len(w) > 1 and w not in STOP]

class DemandModel:
    def __init__(self, tasks):
        self.tasks = tasks
        self.documents = [Counter(tokens(' '.join(task.get('aliases', [])))) for task in tasks]
        df = Counter(word for doc in self.documents for word in doc)
        self.idf = {word: math.log((1 + len(tasks)) / (1 + count)) + 1 for word, count in df.items()}

    def match(self, query, country):
        words = Counter(tokens(query))
        # Unknown words also count against similarity; no confident one-token hit.
        weights = {word: (1 + math.log(count)) * self.idf.get(word, math.log(1 + len(self.tasks)) + 1) for word, count in words.items()}
        query_length = math.sqrt(sum(w*w for w in weights.values()))
        ranked = []
        for task, doc in zip(self.tasks, self.documents):
            if task['country'] != country or len(words.keys() & doc.keys()) < 2:
                continue
            vector = {word: (1 + math.log(count)) * self.idf[word] for word, count in doc.items()}
            length = math.sqrt(sum(w*w for w in vector.values()))
            score = sum(weights.get(word, 0) * weight for word, weight in vector.items()) / (length * query_length) if length and query_length else 0
            ranked.append((score, task['id'], task))
        ranked.sort(key=lambda row: (-row[0], row[1]))
        if not ranked or ranked[0][0] < .25:
            return None
        # Ambiguous needs remain unmapped rather than forced into a product funnel.
        if len(ranked) > 1 and ranked[0][0] - ranked[1][0] < .08:
            return None
        return {'task': ranked[0][2], 'score': round(ranked[0][0], 4), 'method': 'country_tfidf_v1', 'requires_review': True}
