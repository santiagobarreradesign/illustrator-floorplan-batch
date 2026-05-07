# Publish this project on GitHub

Follow these steps on your Mac (Terminal).

## 1. Create an empty repository on GitHub

1. Sign in at [github.com](https://github.com).
2. Click **+**, then **New repository**.
3. Choose a name (e.g. `illustrator-floorplan-batch`).
4. Pick **Public** or **Private**.
5. **Best:** do **not** add a README, `.gitignore`, or license on GitHub if you already have them locally (avoids merge headaches).
6. Click **Create repository**.

Copy the clone URL:

- `https://github.com/YOUR_USERNAME/YOUR_REPO.git`
- or `git@github.com:YOUR_USERNAME/YOUR_REPO.git`

---

## 2. Push an existing local clone

From your repo root (use your real path):

```bash
cd "$HOME/Desktop/Floorplan Test"

git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

If Git is not initialized yet:

```bash
cd "$HOME/Desktop/Floorplan Test"
git init
git add .
git commit -m "Initial commit: Illustrator floor plan batch tooling"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

---

## 3. Optional: GitHub CLI (`gh`)

Install [Homebrew](https://brew.sh) first if needed, then:

```bash
brew install gh
gh auth login
cd "$HOME/Desktop/Floorplan Test"
gh repo create illustrator-floorplan-batch --public --source=. --remote=origin --push
```

Use `--private` instead of `--public` if you prefer.

---

## 4. Push rejected: remote contains work you do not have locally

This happens when GitHub already has a commit (for example you checked **Add a README** when creating the repo) but your laptop has a **different** first commit.

From your project root:

```bash
git fetch origin
git pull origin main --allow-unrelated-histories --no-rebase --no-edit
```

If Git reports conflicts in `README.md` or `LICENSE`, keep the version that contains your full tooling repo (usually **your local** copy):

```bash
git checkout --ours README.md LICENSE
git add README.md LICENSE
git commit -m "Merge origin/main; keep local README/LICENSE"
git push -u origin main
```

---

## 5. After publishing

- Add an **About** description on the GitHub repo page.
- This project is **Illustrator automation**, not a static website; GitHub Pages is optional.

**Live repo:** [github.com/santiagobarreradesign/illustrator-floorplan-batch](https://github.com/santiagobarreradesign/illustrator-floorplan-batch)
