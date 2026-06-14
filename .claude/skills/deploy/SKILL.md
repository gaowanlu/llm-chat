# Deploy Skill

Automate the deployment pipeline: run tests, build, and push to staging.

## Procedure

When invoked, execute the following steps in order. If any step fails, stop and report the error — do not proceed to the next step.

### 1. Run Tests

```bash
npm test
```

If the test command exits with a non-zero status, report the failure and abort the deploy.

### 2. Build Production Bundle

```bash
npm run build
```

If no `build` script exists in `package.json`, skip this step and inform the user: "No build script found — skipping build."

### 3. Push to Staging

Determine the staging target:

1. Check if a `staging` git remote exists: `git remote get-url staging`
2. If it exists, fast-forward merge from main and push:

   ```bash
   git pull --ff-only origin main
   git push origin staging
   ```

3. If no `staging` remote exists, check for a `staging` branch on the current remote:

   ```bash
   git push origin main:staging
   ```

4. If neither exists, inform the user and abort — there is no staging destination to push to.

After a successful push, print a confirmation summary:

```
Deployed to staging successfully.
- Tests: passed
- Build: skipped (no build script)   # or "Build: completed"
- Target: staging
```
