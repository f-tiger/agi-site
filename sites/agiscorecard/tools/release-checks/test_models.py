import unittest

from models import derive


class ModelAnnouncements(unittest.TestCase):
    def snapshot(self, *items):
        return {'checkedAt': '2026-11-20T10:33:45Z', 'sources': [], 'items': list(items)}

    def row(self, title, company='OpenAI', **fields):
        url = ('https://openai.com/index/announcement' if company == 'OpenAI'
               else 'https://anthropic.com/claude-fable-and-mythos-5-2')
        return {'company': company, 'title': title, 'url': url,
                'publishedAt': '2026-11-17T17:45:00Z', **fields}

    def test_positive_launch_with_multiple_model_names_counts_once(self):
        result = derive(self.snapshot(
            self.row('Introducing GPT-6.2 Astra and Sol'),
            self.row('Introducing Claude Fable 5.2 and Claude Mythos 5.2', 'Anthropic'),
        ), {})
        self.assertEqual(len(result['models']), 2)
        self.assertEqual({r['publishedAt'] for r in result['models']}, {'2026-11-17'})
        for title, company in [('GPT-5-Codex is now available', 'OpenAI'),
                               ('Introducing OpenAI o3 and o4-mini', 'OpenAI'),
                               ('Introducing Claude Mythos and Fable 5.1', 'Anthropic')]:
            with self.subTest(title=title):
                self.assertEqual(len(derive(self.snapshot(self.row(title, company)), {})['models']), 1)

    def test_excludes_other_titles_and_unsubstantiated_article_sources(self):
        for row in [
            self.row('Announcing funding for GPT-6.2'),
            self.row('Introducing GPT-6.2 Astra for financial services'),
            self.row('Introducing GPT-6.2 Astra system card'),
            self.row('Introducing evaluation tools for GPT-6.2'),
            self.row('Introducing GPT-6.2', 'Anthropic'),
            self.row('Introducing GPT-6.2', publishedAt=None),
            self.row('Introducing GPT-6.2', publishedAt='2026-11-21'),
            self.row('Introducing GPT-6.2', url='https://openai.com.evil.example/index/gpt-6'),
            self.row('Introducing GPT-6.2', url='https://openai.com/index/../gpt-6'),
        ]:
            with self.subTest(row=row):
                self.assertEqual(derive(self.snapshot(row), {})['models'], [])

    def test_dedupe_rotation_corrections_and_failed_source_health(self):
        row = self.row('Introducing GPT-6.2 Astra and Sol')
        fresh = derive(self.snapshot(row), {})
        self.assertEqual(derive(self.snapshot(row, row), fresh), fresh)
        archived = derive(self.snapshot(), fresh)
        self.assertEqual(archived['models'], fresh['models'])
        self.assertFalse(archived['sources'][0]['ok'])
        self.assertIsNone(archived['sources'][0]['lastSuccessAt'])
        corrected = self.row('Lessons from deploying GPT-6.2')
        self.assertEqual(derive(self.snapshot(corrected), fresh)['models'], [])


if __name__ == '__main__':
    unittest.main()
