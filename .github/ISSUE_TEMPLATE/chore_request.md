---
name: Chore
about: Propose maintenance, tooling, CI/CD, dependencies, or refactoring — no library API change.
title: '[CHORE] - '
labels: 'chore'
assignees: ''

---

## 1. Context
<!-- Why is this chore needed and who is affected? Describe current state and what is not working well. -->
*   **Current State:** <!-- e.g., ci.yml triggers only on main/develop, package scope is @may-salguedo, release uses --generate-notes -->
*   **Affected Area:** <!-- e.g., CI workflow, CD publishing, dependencies, tooling, docs -->

## 2. Motivation
<!-- What friction or risk does this cause if not done? What outcome if solved? -->
*   **Friction / Risk:** <!-- e.g., no CI feedback on feature branches, GH Packages 403 due to case-sensitive scope -->
*   **Outcome if Completed:** <!-- e.g., CI runs on every branch, package publishes under @MaySalguedo, release uses RELEASE_NOTES.md -->

## 3. Scope
<!-- Clearly bound the work to avoid scope creep. -->
**In Scope:**
- [ ] <!-- e.g., package.json:2 name, README.md imports, ci.yml:4 branches, cd.yml:134 --notes-file -->

**Out of Scope:**
- [ ] <!-- e.g., no public API change in src/, no feature logic -->
- [ ] <!-- e.g., no breaking consumer migration beyond scope rename -->

## 4. Proposed Approach (Optional)
<!-- Optional. Leave blank if only describing the problem. Sketch intent, not implementation spec. -->
*   Desired end state in one sentence.
*   Constraints or boundaries to keep in mind.

<details>
<summary>Optional: Rough notes</summary>

```text
// e.g., unify package.json:2 to @MaySalguedo, remove jq rewrite in scripts/publish-github-packages.sh:2, switch cd.yml:134 to --notes-file
```

</details>

## 5. Acceptance Criteria
<!-- Lightweight checklist. Each item must be verifiable via CI, publish, or manual step. -->
- [ ] **AC1:** <!-- e.g., CI triggers on any branch push -->
- [ ] **AC2:** <!-- e.g., pnpm build / pnpm pack name correct -->
- [ ] **AC3:** <!-- e.g., tag v* publishes to npmjs + GH Packages -->
- [ ] **AC4:** <!-- e.g., pnpm lint:no-spec / pnpm check passes -->

## 6. Risks / Rollback
<!-- Any breaking potential, token/permission needs, or how to revert if publish fails. -->
*   **Risks:** <!-- e.g., scope rename is breaking for consumers, NPM_TOKEN scope access -->
*   **Rollback:** <!-- e.g., revert tag, republish previous version -->

## 7. Additional Context
<!-- Links, related issues/PRs, references. -->

- Related Issue: #
- References: <!-- e.g., trivy.yaml, .github/workflows/ci.yml, cd.yml -->
- Breaking Change? Yes / No
