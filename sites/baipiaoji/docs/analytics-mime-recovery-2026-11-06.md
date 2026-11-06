# Analytics MIME delivery correction

The public-content delivery generator copied the headers of
`protectAnalyticsResponse(new Response(''))` into a wildcard static-asset rule.
The string Response constructor implicitly adds `Content-Type: text/plain`.
That type was consequently applied to analytics modules, CSS and the empty
HTML frame, despite correct response bodies and HTTP 200 statuses.

An anonymous browser loading current BPJ responses rejected the module and CSS
under strict MIME checking and did not create the analytics frame. All collection
requests were intercepted, so this diagnostic generated no production events.
The static-delivery generator was introduced on November 1; the precise duration
and amount of historical lost collection require separate backend evidence.

The generator now copies the same security policy from a bodyless Response.
Static hosting retains each file's MIME type. No routing, CSP, nosniff, consent,
measurement ID, private exclusion or business event changes are required. Live
delivery checks additionally reject a plain-text script, stylesheet or frame even
when its bytes, status and delivery marker match. Existing regression tests cover
all three wrong-type responses and preservation of the security policy.

This release publishes BPJ only through the existing read-only product flow.
Other sites receive no additional deployment from this maintenance action.
Historical missing events are not reconstructed. Asset execution and intercepted
collection attempts are technical checks, not real users or GA4 backend receipt.

After the header correction, the versioned stylesheet could still return cached
plain-text metadata while its unversioned URL returned CSS. Refresh the existing
content-based analytics release hash and validate MIME types on the exact
versioned URLs checked by the asset verifier. No event behavior changes. Tests
also reject matching asset bytes with missing or plain-text MIME metadata.
