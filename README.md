# NGETU Website

Edit the website on `main`. Plesk serves the generated `plesk` branch. This repository contains the NGETU website and its Worker backend, including the Sagola shop, enquiry forms, administration, Payfast integration and Microsoft Dynamics 365 Business Central integration.

## Connect Plesk

1. Under **Websites & Domains → ngetu.co.za**, create an empty folder inside this site's directory, for example `ngetu.co.za/public-web`. Set this domain's **Hosting Settings → Document root** to that folder. This keeps previously uploaded source files and the old Default.aspx outside the public folder. Confirm the path shown for this subscription.
2. Choose **Get Started → Deploy using Git**. Choose a *remote* repository and paste `https://github.com/arkamandol5/ngetu-website.git`. Start with **No deployment** until you can select the branch.
3. Open **Change branch and path**, select **plesk**, and select the same empty document root. Choose **Manual deployment**, then **Deploy from Repository**. No server build command or GitHub password is required.
4. Open the homepage, a service page, search, and the Sagola shop. The content pages run in IIS. The shop, checkout, reviews and staff sign-in continue on the hosted NGETU application, which supplies the database, file storage and authenticated APIs. These journeys change the browser address to the hosted application. Content edited in that application's CMS must also be incorporated in source to update the Plesk pages.
5. For the public domain, verify the site's assigned IP in Plesk and point the root A record(s) to that IP only. A www CNAME to ngetu.co.za can follow it. Issue/verify HTTPS for both names and preserve Microsoft 365 mail records.

Hosting instructions: https://docs.plesk.com/en-US/obsidian/customer-guide/git-support/using-remote-git-hosting.75848/

## Make an update

Edit the templates in `homepage.html`, `build.py`, `experience.py`, and `content.py`. CSS, scripts, fonts and images are in `public/`. From the repository root:

    python3 scripts/build-plesk.py
    git add -A
    git commit -m "Update NGETU website"
    git push origin main
    bash scripts/publish-plesk.sh

The publish script requires Python 3.9+, Git, Bash, rsync and GitHub push access. In Plesk, click **Pull Updates** and **Deploy from Repository**. To preview the generated pages locally, run `python3 -m http.server --bind 127.0.0.1 --directory .generated/plesk 8000` and open http://127.0.0.1:8000/.

## Backend and launch

For local development use Node 22 LTS (22.13+), npm and Python. Run `npm ci`, `python3 build.py`, then `npm run dev`. Run `node --test tests/*.test.mjs` for the domain, catalogue and commerce tests. The Worker expects a D1 database bound as DB, an R2 bucket bound as BUCKET, the migrations in drizzle/, and Sites identity for admin access. Deploy backend edits to the associated Sites project and verify them on its hosted URL. A Git push to Plesk updates the web pages only.

The build uses review settings, including noindex. Online payments, customer intake and Business Central writes need merchant and tenant configuration and end-to-end testing. See [commerce operations](docs/COMMERCE-OPERATIONS.md) and [client launch inputs](docs/CLIENT-LAUNCH-REQUEST.md). Production credentials belong in the hosting secret store. The configuration template is .env.example.
