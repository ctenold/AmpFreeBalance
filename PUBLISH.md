# Publishing Amp Free Balance

## First Release (v1.0.0)

```bash
# 1. Commit all changes
git add .
git commit -m "Release v1.0.0: Color-coded balance, low balance alerts, improved UX"

# 2. Push to main
git push origin main

# 3. Create and push version tag
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will automatically:
- ✅ Build the VSIX package
- ✅ Create a Release on GitHub
- ✅ Attach the VSIX file for download

**Users can then:**
1. Go to [Releases](https://github.com/ctenold/AmpFreeBalance/releases)
2. Download the `.vsix` file
3. **Ctrl+Shift+P** → Install from VSIX

## Future Updates

For each new version:

```bash
# Make changes
git add .
git commit -m "v1.1.0: Your feature description"

# Tag and push
git tag v1.1.0
git push origin main
git push origin v1.1.0
```

Actions runs automatically with each new tag!

## Check Status

- Go to https://github.com/ctenold/AmpFreeBalance/actions
- View workflow runs and releases
- Download `.vsix` files from Releases page
