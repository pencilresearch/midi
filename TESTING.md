# Testing

This repository includes a static JSON API generator and validation tests.

## Run the test suite

```bash
python3 -m unittest discover -s tests -v
```

## Build the static API locally

```bash
python3 scripts/build_static_api.py --output site
```

This generates:

- `site/api/index.json`
- `site/api/manufacturers.json`
- `site/api/devices.json`
- `site/api/manufacturer/<manufacturer-slug>.json`
- `site/api/device/<manufacturer-slug>/<device-slug>.json`

## Serve the API locally

```bash
python3 -m http.server 8000 -d site
```

Then test a few endpoints:

```bash
curl http://localhost:8000/api/index.json
curl http://localhost:8000/api/manufacturers.json
curl http://localhost:8000/api/device/arturia/microfreak.json
```

## Validate new CSV contributions

The README rule validator only checks newly added or renamed CSV files in CI. You can also run it locally:

```bash
python3 scripts/validate_readme_rules.py "Teenage Engineering/OP-1.csv"
```

## GitHub Pages deployment check

After pushing to `main` or `master`, the `Publish Static API` workflow will build and deploy the site to GitHub Pages.

Once Pages is enabled for the repository, verify:

```bash
curl https://<owner>.github.io/<repo>/api/index.json
curl https://<owner>.github.io/<repo>/api/devices.json
```
