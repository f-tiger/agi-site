"""Small official-shaped fixtures test rejection paths; no live price fixtures."""
import copy
import json
import unittest

from filter_finder_de_sources import DATA, BINDINGS, digest, evaluate, refresh, validate


class SourceTests(unittest.TestCase):
    def setUp(self):
        self.data=json.loads(DATA.read_text())
        self.fixtures={}
        for item in self.data['items']:
            b=BINDINGS[item['id']]
            description=item['compatibility_statement']
            item['approved_description_sha256']=digest(description)
            if b['adapter']=='shopify':
                payload={'id':b['product_id'],'handle':b['source_url'].rsplit('/',1)[-1],
                         'title':b['name'],'description':description,
                         'variants':[{'id':b['variant_id'],'title':b['variant'],'sku':b['sku']}]}
                text=json.dumps(payload)
            else:
                payload={'@type':'Product','name':b['name'],'url':b['source_url'],'sku':b['sku'],'gtin':b['gtin'],'description':description}
                text=f'<h1>{b["name"]}</h1><script type="application/ld+json">{json.dumps(payload)}</script><p>{description}</p>'
            self.fixtures[item['id']]=text

    def test_committed_contract(self):
        validate(json.loads(DATA.read_text()))

    def test_reviewed_model_evidence(self):
        for item in self.data['items']:
            self.assertEqual(evaluate(item,self.fixtures[item['id']])[0],'verified')

    def test_unrelated_model_cannot_be_supplied_by_navigation(self):
        for item in self.data['items']:
            text=self.fixtures[item['id']].replace(item['models'][0],'Different model')
            text += '<nav>'+item['compatibility_statement']+'</nav>'
            self.assertNotEqual(evaluate(item,text)[0],'verified')

    def test_selected_variant_identity_changes(self):
        item=self.data['items'][0]
        text=self.fixtures[item['id']].replace('Standardfilter','Other filter')
        self.assertEqual(evaluate(item,text)[0],'conflict')

    def test_changed_description_does_not_auto_approve(self):
        item=self.data['items'][0]
        payload=json.loads(self.fixtures[item['id']]);payload['description']+=' Also fits another model.'
        self.assertEqual(evaluate(item,json.dumps(payload))[0],'conflict')

    def test_visible_evidence_and_exact_product_required(self):
        item=self.data['items'][1];text=self.fixtures[item['id']]
        self.assertEqual(evaluate(item,text.replace('<p>'+item['compatibility_statement']+'</p>',''))[0],'unavailable')
        self.assertEqual(evaluate(item,text.replace('69309_pseudo','66007'))[0],'conflict')
        self.assertEqual(evaluate(item,text.replace('<h1>','<h2>').replace('</h1>','</h2>'))[0],'unavailable')

    def test_malformed_response_is_unavailable(self):
        for item in self.data['items']:
            for raw in ['null','[]','{}','not a product']:
                self.assertEqual(evaluate(item,raw)[0],'unavailable')

    def test_network_failure_preserves_dates_and_facts_but_withdraws_commerce(self):
        def fail(*args,**kwargs):raise OSError('offline')
        result=refresh(self.data,fail,today='2026-11-16')
        self.assertEqual(result['updated'],self.data['updated'])
        for old,new in zip(self.data['items'],result['items']):
            self.assertEqual(new['checked_at'],old['checked_at'])
            self.assertEqual(new['name'],old['name'])
            self.assertEqual(new['status'],'unavailable')

    def test_bad_market_or_source_is_a_build_error(self):
        for field,value in [('market','US'),('source_url','https://example.com')]:
            data=copy.deepcopy(self.data);data['items'][0][field]=value
            with self.assertRaises(ValueError):validate(data)


if __name__=='__main__':unittest.main()
