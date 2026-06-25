# Enabling CI

`docs/ci-workflow.yml` is the GitHub Actions workflow (engine tests + web build).
It lives here (not under `.github/workflows/`) because the push token lacked the
`workflow` OAuth scope. To enable CI:

```bash
gh auth refresh -h github.com -s workflow      # grant the workflow scope
mkdir -p .github/workflows
git mv docs/ci-workflow.yml .github/workflows/ci.yml
git commit -m "Enable CI workflow" && git push
```
