@echo off
cd /d "C:\Users\Administrator\Documents\New project\4-24ciyuntu"
echo [Netlify Deploy] Starting...
npx netlify deploy --prod --dir=dist --functions=netlify/functions > netlify_deploy.log 2>&1
echo [Netlify Deploy] Done. Check netlify_deploy.log
