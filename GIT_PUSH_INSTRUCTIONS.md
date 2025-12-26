# Git Push Instructions

This file documents the steps to push your latest changes to the remote GitHub repository.

## Prerequisites
-   Ensure you have `git` installed.
-   Ensure you are logged in to GitHub if required.

## Standard Workflow

### 1. Check Status
View which files have been modified:
```sh
git status
```

### 2. Stage Changes
Add all modified files to the staging area:
```sh
git add .
```

### 3. Commit Changes
Save your changes with a descriptive message:
```sh
git commit -m "Your descriptive commit message here"
```
*Example:* `git commit -m "Refactor content.js and fix comment counting"`

### 4. Push to Remote
Upload your commits to GitHub:
```sh
git push origin main
```
*(Note: If your branch is named `master`, use `git push origin master`)*

---

## Troubleshooting

-   **"Updates were rejected because the remote contains work that you do not have locally"**:
    Run `git pull origin main` to merge remote changes before pushing.

-   **Authentication Error**:
    Ensure your Personal Access Token (PAT) is valid if using HTTPS, or your SSH keys are configured.
